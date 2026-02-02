// ========== MSA MARKETING COMMAND CENTER - API SERVICE ==========
// Spring Boot Backend Integration

class ApiService {
  constructor() {
    this.baseUrl = window.MSA_CONFIG?.api?.baseUrl || 'http://localhost:8080';
    this.apiKey = window.MSA_CONFIG?.api?.apiKey;
    this.timeout = window.MSA_CONFIG?.api?.timeout || 10000;
    this.currentUser = null;
    this.isAuthenticated = false;
    this.jwtToken = null;
    
    // Load JWT from storage on initialization
    this.loadToken();
  }
  
  // ========== JWT TOKEN MANAGEMENT ==========
  
  // Load JWT from localStorage
  loadToken() {
    try {
      this.jwtToken = localStorage.getItem('msa_jwt_token');
      if (this.jwtToken) {
        console.log('🔑 JWT token loaded from storage');
      }
    } catch (e) {
      console.warn('Could not load JWT from storage:', e);
    }
  }
  
  // Store JWT in localStorage
  setAuthToken(token) {
    try {
      this.jwtToken = token;
      localStorage.setItem('msa_jwt_token', token);
      console.log('🔑 JWT token stored');
    } catch (e) {
      console.error('Could not save JWT to storage:', e);
    }
  }
  
  // Get current JWT token
  getAuthToken() {
    return this.jwtToken;
  }
  
  // Clear JWT token (for logout)
  clearAuthToken() {
    try {
      this.jwtToken = null;
      localStorage.removeItem('msa_jwt_token');
      this.currentUser = null;
      this.isAuthenticated = false;
      console.log('🔑 JWT token cleared');
    } catch (e) {
      console.error('Could not clear JWT from storage:', e);
    }
  }

  // ========== HTTP CLIENT ==========
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    const defaultOptions = {
      credentials: 'include', // Important: sends cookies for session management
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      signal: controller.signal
    };

    // Add JWT Authorization header if token is available
    if (this.jwtToken) {
      defaultOptions.headers['Authorization'] = `Bearer ${this.jwtToken}`;
    }

    // Add API key if available (for bot operations)
    if (this.apiKey && options.useApiKey) {
      defaultOptions.headers['X-API-Key'] = this.apiKey;
    }

    try {
      
      const response = await fetch(url, { 
        ...defaultOptions, 
        ...options
      });
      
      clearTimeout(timeoutId);

      // Handle different response types
      if (response.status === 204) {
        return { success: true };
      }

      if (!response.ok) {
        // Handle 401 Unauthorized - token expired or invalid
        if (response.status === 401) {
          console.warn('🔐 Token expired or invalid, clearing auth');
          this.clearAuthToken();
          // Trigger re-authentication if not on login page
          if (!window.location.pathname.includes('auth-callback')) {
            window.dispatchEvent(new CustomEvent('auth:unauthorized'));
          }
        }
        
        // Handle 403 Forbidden - user not in required Discord server
        if (response.status === 403) {
          console.warn('🚫 Access forbidden - user may not be in required Discord server');
          this.clearAuthToken();
          window.dispatchEvent(new CustomEvent('auth:forbidden'));
        }
        
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText || response.statusText}`);
      }

      // Get the response as text first
      const text = await response.text();
      
      // Fix large integers in the raw JSON string before parsing
      // This regex finds all numeric values that could be IDs and wraps them in quotes
      const fixedText = text.replace(
        /"(channelID|requesterID|assignedToID|additionalAsigneeID|requesterDepartmentID|requesterDepartmentid|id|userId|roleId|guildId)"\s*:\s*(\d{15,})/g,
        '"$1":"$2"'
      );
      
      // Also handle when they're in arrays
      const fixedTextArrays = fixedText.replace(
        /"(channelID|requesterID|assignedToID|additionalAsigneeID|requesterDepartmentID|requesterDepartmentid|id|userId|roleId|guildId)"\s*:\s*\[([^\]]+)\]/g,
        (match, key, values) => {
          // Convert numeric values in arrays to strings
          const stringifiedValues = values.replace(/(\d{15,})/g, '"$1"');
          return `"${key}":[${stringifiedValues}]`;
        }
      );
      
      const data = JSON.parse(fixedTextArrays);
      
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      console.error('❌ API request error:', error);
      throw error;
    }
  }

  // ========== AUTHENTICATION ==========
  
  // Initiate Discord OAuth2 login
  login() {
    window.location.href = `${this.baseUrl}/oauth2/authorization/discord`;
  }
  
  // Logout - clear token and reset state
  logout() {
    this.clearAuthToken();
    console.log('🚪 User logged out');
    // Optionally trigger UI update
    window.dispatchEvent(new CustomEvent('auth:logout'));
  }

  // Check current authentication status
  async checkAuth() {
    try {
      const user = await this.request('/api/auth/user');
      this.currentUser = user;
      this.isAuthenticated = true;
      return user;
    } catch (error) {
      this.currentUser = null;
      this.isAuthenticated = false;
      return null;
    }
  }

  // Get user's Discord guilds
  async getUserGuilds() {
    try {
      return await this.request('/api/auth/guilds');
    } catch (error) {
      console.error('Failed to fetch guilds:', error);
      return [];
    }
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Check if user is authenticated
  isUserAuthenticated() {
    return this.isAuthenticated;
  }

  // ========== REQUEST MANAGEMENT ==========

  // Get all requests
  async getAllRequests() {
    return await this.request('/api/requests');
  }

  // Get request by channel ID
  async getRequestByChannelId(channelId) {
    return await this.request(`/api/requests/channel/${channelId}`);
  }

  // Get requests by status
  async getRequestsByStatus(status) {
    // Convert display status to API enum
    const apiStatus = this.convertStatusToApiEnum(status);
    return await this.request(`/api/requests/status/${apiStatus}`);
  }

  // Get requests by requester
  async getRequestsByRequester(requesterId) {
    return await this.request(`/api/requests/requester/${requesterId}`);
  }

  // Get requests assigned to user
  async getRequestsByAssignee(assigneeId) {
    return await this.request(`/api/requests/assigned/${assigneeId}`);
  }

  // Get current user's requests
  async getMyRequests() {
    return await this.request('/api/requests/my-requests');
  }

  // Create new request
  async createRequest(requestData) {
    return await this.request('/api/requests', {
      method: 'POST',
      body: JSON.stringify(requestData)
    });
  }

  // Update request
  async updateRequest(channelId, requestData) {
    return await this.request(`/api/requests/channel/${channelId}`, {
      method: 'PUT',
      body: JSON.stringify(requestData)
    });
  }

  // Delete request
  async deleteRequest(channelId) {
    return await this.request(`/api/requests/channel/${channelId}`, {
      method: 'DELETE'
    });
  }

  // Assign request to user
  async assignRequest(channelId, assignedToId) {
    return await this.request(`/api/requests/channel/${channelId}/assign/${assignedToId}`, {
      method: 'PATCH'
    });
  }

  // Set request status
  async setRequestStatus(channelId, status) {
    const apiStatus = this.convertStatusToApiEnum(status);
    return await this.request(`/api/requests/channel/${channelId}/status/${apiStatus}`, {
      method: 'PATCH'
    });
  }

  // Advance request to next status
  async advanceRequest(channelId) {
    return await this.request(`/api/requests/channel/${channelId}/advance`, {
      method: 'PATCH'
    });
  }

  // Update requester department
  async updateRequesterDepartment(channelId, departmentId) {
    return await this.request(`/api/requests/channel/${channelId}/department/${departmentId}`, {
      method: 'PATCH'
    });
  }

  // Get request count by department
  async getRequestCountByDepartment() {
    return await this.request('/api/requests/countByDepartment');
  }

  // ========== DISCORD MAPPING ==========

  // Get single user nickname
  async getUserNickname(userId) {
    try {
      const nickname = await this.request(`/api/discord/users/${userId}`);
      return nickname;
    } catch (error) {
      console.warn(`Failed to get nickname for user ${userId}:`, error);
      return `User ${userId}`;
    }
  }

  // Get single role name
  async getRoleName(roleId) {
    try {
      const roleName = await this.request(`/api/discord/roles/${roleId}`);
      return roleName;
    } catch (error) {
      console.warn(`Failed to get role name for ${roleId}:`, error);
      return `Role ${roleId}`;
    }
  }

  // Bulk lookup for user nicknames
  async bulkGetNicknames(userIds) {
    try {
      return await this.request('/api/discord/users/bulk', {
        method: 'POST',
        body: JSON.stringify(userIds)
      });
    } catch (error) {
      console.warn('Failed to bulk fetch nicknames:', error);
      return {};
    }
  }

  // Bulk lookup for role names
  async bulkGetRoleNames(roleIds) {
    try {
      return await this.request('/api/discord/roles/bulk', {
        method: 'POST',
        body: JSON.stringify(roleIds)
      });
    } catch (error) {
      console.warn('Failed to bulk fetch role names:', error);
      return {};
    }
  }

  // ========== AUDIT EVENTS ==========

  // Get all audit events
  async getAllAuditEvents() {
    return await this.request('/api/audit-events');
  }

  // Get audit event by ID
  async getAuditEventById(id) {
    return await this.request(`/api/audit-events/${id}`);
  }

  // Get audit events by entity
  async getAuditEventsByEntity(entityType, entityId) {
    return await this.request(`/api/audit-events/entity/${entityType}/${entityId}`);
  }

  // Get audit events by type
  async getAuditEventsByType(eventType) {
    return await this.request(`/api/audit-events/type/${eventType}`);
  }

  // Get audit events by user
  async getAuditEventsByUser(userId) {
    return await this.request(`/api/audit-events/user/${userId}`);
  }

  // Get audit events by date range
  async getAuditEventsByDateRange(startDate, endDate) {
    const start = startDate.toISOString().split('.')[0];
    const end = endDate.toISOString().split('.')[0];
    return await this.request(`/api/audit-events/daterange?start=${start}&end=${end}`);
  }

  // Create audit event
  async createAuditEvent(eventType, entityType, entityId, eventDetails, performedBy) {
    const params = new URLSearchParams({
      eventType,
      entityType,
      entityId: entityId.toString(),
      eventDetails,
      performedBy
    });
    return await this.request(`/api/audit-events?${params}`, {
      method: 'POST'
    });
  }

  // ========== HELPER METHODS ==========

  // Convert UI status to API enum
  convertStatusToApiEnum(status) {
    const statusMap = {
      '📥 In Queue': 'IN_QUEUE',
      '🔄 In Progress': 'IN_PROGRESS',
      '⏳ Awaiting Approval': 'AWAITING_POSTING',
      '⏳ Awaiting Posting': 'AWAITING_POSTING',
      '✅ Done': 'DONE',
      '🚫 Blocked': 'BLOCKED',
      'IN_QUEUE': 'IN_QUEUE',
      'IN_PROGRESS': 'IN_PROGRESS',
      'AWAITING_POSTING': 'AWAITING_POSTING',
      'DONE': 'DONE',
      'BLOCKED': 'BLOCKED'
    };
    return statusMap[status] || status;
  }

  // Convert API enum to UI status
  convertApiEnumToStatus(apiStatus) {
    const statusMap = {
      'IN_QUEUE': '📥 In Queue',
      'IN_PROGRESS': '🔄 In Progress',
      'AWAITING_POSTING': '⏳ Awaiting Posting',
      'DONE': '✅ Done',
      'BLOCKED': '🚫 Blocked'
    };
    return statusMap[apiStatus] || apiStatus;
  }

  // Convert request type to display format
  formatRequestType(requestType) {
    if (!requestType) return 'General';
    
    const typeMap = {
      'POST': '📱 POST',
      'REEL': '📹 REEL'
    };
    
    return typeMap[requestType] || requestType;
  }

  // Transform API request to UI event format
  transformRequestToEvent(request) {
    // Ensure all IDs are strings to handle JavaScript's integer limitation
    const ensureString = (val) => val != null ? String(val) : null;
    
    return {
      id: ensureString(request.channelID),
      channel_id: ensureString(request.channelID),
      channelID: ensureString(request.channelID),
      title: request.title,
      description: request.description,
      request_type: request.requestType,
      status: this.convertApiEnumToStatus(request.status),
      posting_date: request.postingDate,
      created_at: request.createdAt,
      updated_at: request.updatedAt,
      requester_id: ensureString(request.requesterID),
      requester_name: null, // Will be enriched with Discord data
      requester_department_id: ensureString(request.requesterDepartmentID),
      requester_department_name: null, // Will be enriched with Discord data
      assigned_to_id: ensureString(request.assignedToID),
      assigned_to_name: null, // Will be enriched with Discord data
      additional_assignee_id: ensureString(request.additionalAsigneeID),
      additional_assignee_name: null, // Will be enriched with Discord data
      room: request.room,
      signup_url: request.signupUrl,
      department: 'Marketing', // Default department
      department_key: 'marketing',
      notes: ''
    };
  }

  // Transform multiple requests to events and enrich with Discord data
  async transformRequestsToEvents(requests) {
    if (!Array.isArray(requests)) return [];
    
    // First transform all requests
    const events = requests.map(r => this.transformRequestToEvent(r));
    
    // Collect all unique user IDs and role IDs
    const userIds = new Set();
    const roleIds = new Set();
    
    events.forEach(event => {
      if (event.requester_id) userIds.add(String(event.requester_id));
      if (event.assigned_to_id) userIds.add(String(event.assigned_to_id));
      if (event.additional_assignee_id) userIds.add(String(event.additional_assignee_id));
      if (event.requester_department_id) roleIds.add(String(event.requester_department_id));
    });
    
    // Fetch all nicknames and role names in bulk
    const [nicknamesMap, roleNamesMap] = await Promise.all([
      userIds.size > 0 ? this.bulkGetNicknames(Array.from(userIds)) : Promise.resolve({}),
      roleIds.size > 0 ? this.bulkGetRoleNames(Array.from(roleIds)) : Promise.resolve({})
    ]);
    
    // Enrich events with the fetched names
    events.forEach(event => {
      if (event.requester_id) {
        event.requester_name = nicknamesMap[String(event.requester_id)] || `User ${event.requester_id}`;
      }
      if (event.assigned_to_id) {
        event.assigned_to_name = nicknamesMap[String(event.assigned_to_id)] || `User ${event.assigned_to_id}`;
      }
      if (event.additional_assignee_id) {
        event.additional_assignee_name = nicknamesMap[String(event.additional_assignee_id)] || `User ${event.additional_assignee_id}`;
      }
      if (event.requester_department_id) {
        const deptName = roleNamesMap[String(event.requester_department_id)] || `Role ${event.requester_department_id}`;
        event.requester_department_name = deptName;
        event.department = deptName;
        // Also set department_key for filtering
        event.department_key = deptName.toLowerCase().replace(/\s+/g, '-');
      }
    });
    
    return events;
  }

  // Generate Discord channel link
  generateDiscordChannelLink(channelId) {
    const guildId = '1165706299393183754';
    return `https://discord.com/channels/${guildId}/${channelId}`;
  }

  // Get status color for UI
  getStatusColor(status) {
    const apiStatus = this.convertStatusToApiEnum(status);
    const colorMap = {
      'IN_QUEUE': '#6c757d',
      'IN_PROGRESS': '#007bff',
      'AWAITING_POSTING': '#ffc107',
      'DONE': '#28a745',
      'BLOCKED': '#dc3545'
    };
    return colorMap[apiStatus] || '#6c757d';
  }
}

// Create global API service instance
window.apiService = new ApiService();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ApiService;
}
