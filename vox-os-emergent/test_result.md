#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  Build Vox OS personal assistant with voice input (Speech-to-Text) functionality.
  User wants to speak to the AI instead of typing.
  Also need to fix task deletion via chat (AI failing to delete multiple tasks).

backend:
  - task: "Voice Transcription API"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Implemented POST /api/transcribe endpoint using OpenAI Whisper via emergentintegrations. Accepts audio files (webm, wav, mp3, etc.), validates format and size, returns transcribed text."

  - task: "Task Deletion via Chat"
    implemented: true
    working: false
    file: "/app/backend/server.py"
    stuck_count: 2
    priority: "high"
    needs_retesting: true
    status_history:
      - working: false
        agent: "user"
        comment: "User reports AI fails to delete multiple tasks or tasks based on criteria (e.g., 'delete all high energy tasks'). AI either deletes only one task or doesn't see tasks correctly."
      - working: "NA"
        agent: "main"
        comment: "Previous agent added DELETE_ALL_TASKS, DELETE_TASKS parsing logic and updated system prompt with examples. Issue persists - needs deeper debugging."

  - task: "Google Calendar Write APIs"
    implemented: true
    working: true
    file: "/app/backend/server.py, /app/backend/calendar_integration.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Calendar write APIs working after user reconnected Google Calendar."

frontend:
  - task: "Voice Input UI (Microphone Button)"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/pages/VoxDashboard.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Added microphone button next to send button in chat input. Uses MediaRecorder API for audio capture. Button shows recording state (red pulse) and transcribing state (spinner). Transcribed text populates input field."

  - task: "Calendar Event Modal"
    implemented: true
    working: true
    file: "/app/frontend/src/components/CalendarEventModal.jsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Calendar modal working correctly."

metadata:
  created_by: "main_agent"
  version: "1.1"
  test_sequence: 2
  run_ui: true

test_plan:
  current_focus:
    - "Voice Transcription API"
    - "Voice Input UI (Microphone Button)"
    - "Task Deletion via Chat"
  stuck_tasks:
    - "Task Deletion via Chat"
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      Implemented Voice Input (Speech-to-Text) feature:
      
      BACKEND:
      1. POST /api/transcribe endpoint using OpenAI Whisper via emergentintegrations
      2. Validates audio format (webm, wav, mp3, mp4, m4a, ogg) and size (max 25MB)
      3. Uses EMERGENT_LLM_KEY for authentication
      4. Returns {text: "transcribed text", success: true}
      
      FRONTEND:
      1. Added Mic, MicOff, Loader2 icons to imports
      2. Added state: isRecording, isTranscribing, mediaRecorderRef, audioChunksRef
      3. Added functions: startRecording, stopRecording, transcribeAudio, toggleRecording
      4. Added microphone button in chat input area with visual states:
         - Default: Mic icon
         - Recording: MicOff icon with red pulse animation
         - Transcribing: Loader2 spinner
      5. Transcribed text populates the input field for user to review/edit before sending
      
      TESTING NEEDED:
      1. Test /api/transcribe endpoint with actual audio file
      2. Test frontend microphone permission flow
      3. Test recording and transcription end-to-end
      4. Test Task Deletion via Chat - this is a STUCK task that needs investigation