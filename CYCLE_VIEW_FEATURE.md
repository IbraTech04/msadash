# Cycle View Feature Documentation

## Overview
The Interactive Calendar now includes a powerful **Cycle View** mode that allows you to visualize and explore the 14-day marketing production cycles.

## How It Works

### Cycle Configuration
- **Cycle Start Date**: November 2, 2025
- **Cycle Length**: 14 days (2 weeks)
- **Three Windows per Cycle**:
  1. **Request Window** (Blue) - Cycle 0: The current cycle for new requests
  2. **Production Window** (Gold) - Cycle +1: Next cycle for production work
  3. **Posting Window** (Green) - Cycle +2: Two cycles ahead for posting content

### Using Cycle View

#### Activating Cycle View
1. Navigate to the **Calendar** section
2. Click the **"Cycle View: OFF"** button in the calendar controls
3. The button will turn gold and display **"Cycle View: ON"**
4. Events will disappear, showing a clean calendar view

#### Interactive Highlighting

**Normal Mode (Default)**
- Hover over any date on the calendar
- Three 14-day windows will be highlighted:
  - **Request Window** (Light Blue) - The hovered date's cycle
  - **Production Window** (Gold) - Next cycle
  - **Posting Window** (Light Green) - Two cycles ahead

**SHIFT Mode (Reversed Logic)**
- Hold down the **SHIFT** key
- Hover over any date
- The logic reverses:
  - **Posting Window** (Light Green) - The hovered date's cycle
  - **Production Window** (Gold) - Previous cycle
  - **Request Window** (Light Blue) - Two cycles before

This allows you to work backwards from a posting date to see when requests should have been submitted.

#### Cycle Labels
Each cycle window displays a label in the top-right corner of the first day:
- "REQUEST WINDOW"
- "PRODUCTION WINDOW"  
- "POSTING WINDOW"

#### Deactivating Cycle View
1. Click the **"Cycle View: ON"** button again
2. The button returns to blue showing **"Cycle View: OFF"**
3. All events reappear on the calendar
4. Normal calendar functionality resumes

## Use Cases

### Planning New Requests
1. Enable Cycle View
2. Hover over today's date
3. See the current Request Window (blue)
4. Know the Production Window (gold) for when work will be done
5. Know the Posting Window (green) for when content will go live

### Working Backwards from Deadlines
1. Enable Cycle View
2. Hold SHIFT key
3. Hover over your target posting date
4. See when production should happen (previous cycle)
5. See when the request should be submitted (two cycles before)

### Visualizing Workflow
- Quickly identify which cycle you're currently in
- See the pipeline of work across multiple cycles
- Understand the timing relationship between request, production, and posting phases

## Technical Details

### Cycle Calculation
- Cycles are calculated based on days elapsed since November 2, 2025
- Each cycle is exactly 14 days
- Cycle numbers start at 0 and increment indefinitely
- Past cycles (before November 2, 2025) are not highlighted

### Color Scheme
**Light Mode**:
- Request: Light Blue (#87CEEB)
- Production: Gold (#FFD700)
- Posting: Light Green (#90EE90)

**Night Mode**:
- Request: Blue (#4A9EFF)
- Production: Gold (dimmed)
- Posting: Green (#4DD365)

### Keyboard Shortcuts
- **SHIFT + Hover**: Reverse cycle logic (work backwards from posting date)

## Browser Compatibility
- Works in all modern browsers (Chrome, Firefox, Safari, Edge)
- Requires JavaScript enabled
- Keyboard events (SHIFT key) supported

## Tips
- Use Normal Mode when planning forward: "What cycle is this request for?"
- Use SHIFT Mode when planning backward: "When should I have started for this posting date?"
- Keep Cycle View enabled while planning to maintain context
- Switch back to regular calendar view to see actual events and deadlines
