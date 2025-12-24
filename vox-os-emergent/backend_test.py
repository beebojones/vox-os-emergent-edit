import requests
import sys
import json
from datetime import datetime

class VoxOSAPITester:
    def __init__(self, base_url="https://voxos-ai.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.session_id = "test_session"

    def run_test(self, name, method, endpoint, expected_status, data=None, timeout=30):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if endpoint else f"{self.api_url}/"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=timeout)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=timeout)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=timeout)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                except:
                    print(f"   Response: {response.text[:200]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:300]}...")
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response.text[:300]
                })

            return success, response.json() if success and response.text else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "error": str(e)
            })
            return False, {}

    def test_health_endpoints(self):
        """Test health check endpoints"""
        print("\n=== TESTING HEALTH ENDPOINTS ===")
        
        # Test root API endpoint
        self.run_test("Root API Endpoint", "GET", "", 200)
        
        # Test health endpoint
        self.run_test("Health Check", "GET", "health", 200)

    def test_chat_functionality(self):
        """Test chat functionality"""
        print("\n=== TESTING CHAT FUNCTIONALITY ===")
        
        # Test chat with Vox
        success, response = self.run_test(
            "Chat with Vox", 
            "POST", 
            "chat", 
            200,
            data={"message": "Hello Vox, how are you?", "session_id": self.session_id},
            timeout=60  # AI responses can take longer
        )
        
        if success:
            print(f"   AI Response: {response.get('response', 'No response')[:100]}...")
        
        # Test get chat history
        self.run_test("Get Chat History", "GET", f"chat/history/{self.session_id}", 200)
        
        # Test clear chat history
        self.run_test("Clear Chat History", "DELETE", f"chat/history/{self.session_id}", 200)

    def test_briefing_functionality(self):
        """Test briefing functionality"""
        print("\n=== TESTING BRIEFING FUNCTIONALITY ===")
        
        # Test morning briefing
        success, response = self.run_test(
            "Morning Briefing", 
            "GET", 
            "briefing/morning", 
            200,
            timeout=60  # AI responses can take longer
        )
        
        if success:
            print(f"   Morning Briefing: {response.get('content', 'No content')[:100]}...")
        
        # Test evening briefing
        success, response = self.run_test(
            "Evening Briefing", 
            "GET", 
            "briefing/evening", 
            200,
            timeout=60  # AI responses can take longer
        )
        
        if success:
            print(f"   Evening Briefing: {response.get('content', 'No content')[:100]}...")

    def test_calendar_functionality(self):
        """Test calendar functionality"""
        print("\n=== TESTING CALENDAR FUNCTIONALITY ===")
        
        # Test get calendar events
        success, events = self.run_test("Get Calendar Events", "GET", "calendar", 200)
        
        # Test create calendar event
        today = datetime.now().strftime("%Y-%m-%d")
        event_data = {
            "title": "Test Meeting",
            "description": "Test event description",
            "start_time": "10:00",
            "end_time": "11:00",
            "date": today,
            "color": "cyan"
        }
        
        success, created_event = self.run_test(
            "Create Calendar Event", 
            "POST", 
            "calendar", 
            200,
            data=event_data
        )
        
        event_id = None
        if success and 'id' in created_event:
            event_id = created_event['id']
            print(f"   Created event ID: {event_id}")
            
            # Test delete calendar event
            self.run_test("Delete Calendar Event", "DELETE", f"calendar/{event_id}", 200)

    def test_task_functionality(self):
        """Test task functionality"""
        print("\n=== TESTING TASK FUNCTIONALITY ===")
        
        # Test get tasks
        success, tasks = self.run_test("Get Tasks", "GET", "tasks", 200)
        
        # Test create task
        task_data = {
            "title": "Test Task",
            "description": "Test task description",
            "priority": "high",
            "energy_level": "medium"
        }
        
        success, created_task = self.run_test(
            "Create Task", 
            "POST", 
            "tasks", 
            200,
            data=task_data
        )
        
        task_id = None
        if success and 'id' in created_task:
            task_id = created_task['id']
            print(f"   Created task ID: {task_id}")
            
            # Test update task
            update_data = {"status": "completed"}
            self.run_test(
                "Update Task Status", 
                "PUT", 
                f"tasks/{task_id}", 
                200,
                data=update_data
            )
            
            # Test delete task
            self.run_test("Delete Task", "DELETE", f"tasks/{task_id}", 200)

    def test_memory_functionality(self):
        """Test memory functionality"""
        print("\n=== TESTING MEMORY FUNCTIONALITY ===")
        
        # Test get memories
        success, memories = self.run_test("Get Memories", "GET", "memories", 200)
        
        # Test create memory
        memory_data = {
            "content": "Test memory content",
            "category": "fact",
            "tags": ["test", "api"]
        }
        
        success, created_memory = self.run_test(
            "Create Memory", 
            "POST", 
            "memories", 
            200,
            data=memory_data
        )
        
        memory_id = None
        if success and 'id' in created_memory:
            memory_id = created_memory['id']
            print(f"   Created memory ID: {memory_id}")
            
            # Test delete memory
            self.run_test("Delete Memory", "DELETE", f"memories/{memory_id}", 200)

    def test_google_calendar_auth(self):
        """Test Google Calendar OAuth endpoints"""
        print("\n=== TESTING GOOGLE CALENDAR AUTH ===")
        
        # Test Google Calendar connection status
        success, status = self.run_test("Google Calendar Status", "GET", "auth/google/status", 200)
        if success:
            print(f"   Connection Status: {status.get('connected', False)}")
        
        # Test Google Calendar login URL generation
        success, login_response = self.run_test("Google Calendar Login URL", "GET", "auth/google/login", 200)
        if success:
            auth_url = login_response.get('authorization_url', '')
            print(f"   Auth URL generated: {len(auth_url) > 0}")
            print(f"   Contains Google OAuth: {'accounts.google.com' in auth_url}")
        
        # Test Google Calendar disconnect (should work even if not connected)
        success, disconnect_response = self.run_test("Google Calendar Disconnect", "POST", "auth/google/disconnect", 200)
        if success:
            print(f"   Disconnect Response: {disconnect_response.get('message', 'No message')}")

    def test_google_calendar_events(self):
        """Test Google Calendar events endpoints"""
        print("\n=== TESTING GOOGLE CALENDAR EVENTS ===")
        
        # Test fetch calendar events (should return not connected when no auth)
        success, events_response = self.run_test("Google Calendar Events", "GET", "google-calendar/events", 200)
        if success:
            print(f"   Connected: {events_response.get('connected', False)}")
            print(f"   Events Count: {len(events_response.get('events', []))}")
            if not events_response.get('connected'):
                print(f"   Expected 'not connected' message: {events_response.get('message', '')}")
        
        # Test today's events
        success, today_response = self.run_test("Google Calendar Today Events", "GET", "google-calendar/today", 200)
        if success:
            print(f"   Connected: {today_response.get('connected', False)}")
            print(f"   Today's Events Count: {today_response.get('count', 0)}")

    def test_google_calendar_write_endpoints(self):
        """Test Google Calendar write endpoints (expected to fail with 'Calendar not connected')"""
        print("\n=== TESTING GOOGLE CALENDAR WRITE ENDPOINTS ===")
        
        # Test create calendar event (should return 400 with 'Calendar not connected')
        event_data = {
            "title": "Test Event",
            "start_time": "2025-12-25T10:00:00",
            "end_time": "2025-12-25T11:00:00",
            "description": "Test event description",
            "location": "Test location"
        }
        
        success, create_response = self.run_test(
            "Create Google Calendar Event (Expected to fail)", 
            "POST", 
            "google-calendar/events", 
            400,  # Expected to fail with 400
            data=event_data
        )
        if success:
            error_msg = create_response.get('detail', '')
            print(f"   Expected error message: {error_msg}")
            expected_errors = ['Calendar not connected', 'not connected', '403', 'Insufficient']
            has_expected_error = any(err.lower() in error_msg.lower() for err in expected_errors)
            print(f"   Contains expected error: {has_expected_error}")
        
        # Test update calendar event (should return 400 with 'Calendar not connected')
        update_data = {
            "title": "Updated Test Event",
            "start_time": "2025-12-25T11:00:00",
            "end_time": "2025-12-25T12:00:00"
        }
        
        success, update_response = self.run_test(
            "Update Google Calendar Event (Expected to fail)", 
            "PUT", 
            "google-calendar/events/test_event_id", 
            400,  # Expected to fail with 400
            data=update_data
        )
        if success:
            error_msg = update_response.get('detail', '')
            print(f"   Expected error message: {error_msg}")
            expected_errors = ['Calendar not connected', 'not connected', '403', 'Insufficient']
            has_expected_error = any(err.lower() in error_msg.lower() for err in expected_errors)
            print(f"   Contains expected error: {has_expected_error}")
        
        # Test delete calendar event (should return 400 with 'Calendar not connected')
        success, delete_response = self.run_test(
            "Delete Google Calendar Event (Expected to fail)", 
            "DELETE", 
            "google-calendar/events/test_event_id", 
            400  # Expected to fail with 400
        )
        if success:
            error_msg = delete_response.get('detail', '')
            print(f"   Expected error message: {error_msg}")
            expected_errors = ['Calendar not connected', 'not connected', '403', 'Insufficient']
            has_expected_error = any(err.lower() in error_msg.lower() for err in expected_errors)
            print(f"   Contains expected error: {has_expected_error}")

    def test_transcription_api(self):
        """Test voice transcription API"""
        print("\n=== TESTING VOICE TRANSCRIPTION API ===")
        
        # Test transcription endpoint with invalid format (should return 400)
        try:
            import io
            # Create a fake text file to test format validation
            fake_audio = io.BytesIO(b"This is not audio data")
            files = {'file': ('test.txt', fake_audio, 'text/plain')}
            
            response = requests.post(
                f"{self.api_url}/transcribe", 
                files=files,
                timeout=30
            )
            
            self.tests_run += 1
            if response.status_code == 400:
                self.tests_passed += 1
                print("✅ Transcription Format Validation - Status: 400 (Expected)")
                print(f"   Error message: {response.json().get('detail', 'No detail')}")
            else:
                print(f"❌ Transcription Format Validation - Expected 400, got {response.status_code}")
                self.failed_tests.append({
                    "test": "Transcription Format Validation",
                    "expected": 400,
                    "actual": response.status_code,
                    "response": response.text[:300]
                })
        except Exception as e:
            print(f"❌ Transcription Format Validation - Error: {str(e)}")
            self.failed_tests.append({
                "test": "Transcription Format Validation",
                "error": str(e)
            })
        
        # Test transcription endpoint without file (should return 422)
        try:
            response = requests.post(f"{self.api_url}/transcribe", timeout=30)
            
            self.tests_run += 1
            if response.status_code == 422:
                self.tests_passed += 1
                print("✅ Transcription Missing File - Status: 422 (Expected)")
            else:
                print(f"❌ Transcription Missing File - Expected 422, got {response.status_code}")
                self.failed_tests.append({
                    "test": "Transcription Missing File",
                    "expected": 422,
                    "actual": response.status_code,
                    "response": response.text[:300]
                })
        except Exception as e:
            print(f"❌ Transcription Missing File - Error: {str(e)}")
            self.failed_tests.append({
                "test": "Transcription Missing File",
                "error": str(e)
            })

    def test_task_deletion_via_chat(self):
        """Test task deletion via chat functionality"""
        print("\n=== TESTING TASK DELETION VIA CHAT ===")
        
        # First, create some test tasks to delete
        test_tasks = [
            {"title": "Test Task 1", "priority": "high", "energy_level": "high"},
            {"title": "Test Task 2", "priority": "normal", "energy_level": "medium"},
            {"title": "Test Task 3", "priority": "low", "energy_level": "low"},
            {"title": "High Energy Task", "priority": "normal", "energy_level": "high"}
        ]
        
        created_task_ids = []
        for task_data in test_tasks:
            success, created_task = self.run_test(
                f"Create Test Task: {task_data['title']}", 
                "POST", 
                "tasks", 
                200,
                data=task_data
            )
            if success and 'id' in created_task:
                created_task_ids.append(created_task['id'])
        
        print(f"   Created {len(created_task_ids)} test tasks for deletion testing")
        
        if len(created_task_ids) >= 2:
            # Test single task deletion via chat
            success, response = self.run_test(
                "Chat Delete Single Task", 
                "POST", 
                "chat", 
                200,
                data={
                    "message": f"Delete the task with ID {created_task_ids[0]}", 
                    "session_id": self.session_id
                },
                timeout=60
            )
            
            if success:
                print(f"   AI Response: {response.get('response', 'No response')[:100]}...")
                task_deleted = response.get('task_deleted')
                print(f"   Task Deleted Field: {task_deleted}")
                
                # Verify task was actually deleted
                success_check, tasks = self.run_test("Verify Task Deletion", "GET", "tasks", 200)
                if success_check:
                    remaining_ids = [t['id'] for t in tasks]
                    was_deleted = created_task_ids[0] not in remaining_ids
                    print(f"   Task Actually Deleted: {was_deleted}")
            
            # Test multiple task deletion via chat
            if len(created_task_ids) >= 3:
                success, response = self.run_test(
                    "Chat Delete Multiple Tasks", 
                    "POST", 
                    "chat", 
                    200,
                    data={
                        "message": f"Delete tasks with IDs {created_task_ids[1]} and {created_task_ids[2]}", 
                        "session_id": self.session_id
                    },
                    timeout=60
                )
                
                if success:
                    print(f"   AI Response: {response.get('response', 'No response')[:100]}...")
                    task_deleted = response.get('task_deleted')
                    print(f"   Task Deleted Field: {task_deleted}")
            
            # Test delete all high energy tasks
            success, response = self.run_test(
                "Chat Delete High Energy Tasks", 
                "POST", 
                "chat", 
                200,
                data={
                    "message": "Delete all high energy tasks", 
                    "session_id": self.session_id
                },
                timeout=60
            )
            
            if success:
                print(f"   AI Response: {response.get('response', 'No response')[:100]}...")
                task_deleted = response.get('task_deleted')
                print(f"   Task Deleted Field: {task_deleted}")
            
            # Test delete all tasks
            success, response = self.run_test(
                "Chat Delete All Tasks", 
                "POST", 
                "chat", 
                200,
                data={
                    "message": "Delete all tasks", 
                    "session_id": self.session_id
                },
                timeout=60
            )
            
            if success:
                print(f"   AI Response: {response.get('response', 'No response')[:100]}...")
                task_deleted = response.get('task_deleted')
                print(f"   Task Deleted Field: {task_deleted}")
                
                # Verify all tasks were deleted
                success_check, tasks = self.run_test("Verify All Tasks Deleted", "GET", "tasks", 200)
                if success_check:
                    print(f"   Remaining Tasks Count: {len(tasks)}")

    def test_chat_calendar_integration(self):
        """Test chat integration with calendar event creation"""
        print("\n=== TESTING CHAT CALENDAR INTEGRATION ===")
        
        # Test chat message that should create a calendar event
        success, response = self.run_test(
            "Chat Calendar Event Creation", 
            "POST", 
            "chat", 
            200,
            data={
                "message": "Schedule a meeting with John tomorrow at 2pm for 1 hour", 
                "session_id": self.session_id
            },
            timeout=60
        )
        
        if success:
            print(f"   AI Response: {response.get('response', 'No response')[:100]}...")
            
            # Check if response includes event_added field
            event_added = response.get('event_added')
            print(f"   Event Added Field Present: {event_added is not None}")
            
            if event_added:
                print(f"   Event Added: {event_added}")
            else:
                print("   Note: event_added field not present (expected if calendar not connected)")
            
            # Check other response fields
            task_added = response.get('task_added')
            memory_added = response.get('memory_added')
            event_deleted = response.get('event_deleted')
            
            print(f"   Task Added: {task_added is not None}")
            print(f"   Memory Added: {memory_added is not None}")
            print(f"   Event Deleted: {event_deleted is not None}")

    def test_briefing_with_calendar_context(self):
        """Test briefing generation with calendar context note"""
        print("\n=== TESTING BRIEFING WITH CALENDAR CONTEXT ===")
        
        # Test morning briefing (should include calendar context note)
        success, response = self.run_test(
            "Morning Briefing with Calendar Context", 
            "GET", 
            "briefing/morning", 
            200,
            timeout=60
        )
        
        if success:
            content = response.get('content', '')
            print(f"   Briefing Content Length: {len(content)}")
            # Check if briefing mentions calendar source or connection status
            has_calendar_context = any(keyword in content.lower() for keyword in 
                                     ['calendar', 'local', 'google', 'connected', 'not connected'])
            print(f"   Contains Calendar Context: {has_calendar_context}")

    def test_seed_functionality(self):
        """Test seed demo data functionality"""
        print("\n=== TESTING SEED FUNCTIONALITY ===")
        
        self.run_test("Seed Demo Data", "POST", "seed", 200)

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Vox OS API Testing...")
        print(f"Base URL: {self.base_url}")
        
        # Run all test suites
        self.test_health_endpoints()
        self.test_seed_functionality()  # Seed data first for other tests
        self.test_transcription_api()  # Test voice transcription API
        self.test_google_calendar_auth()  # Test Google Calendar OAuth endpoints
        self.test_google_calendar_events()  # Test Google Calendar events endpoints
        self.test_google_calendar_write_endpoints()  # Test write endpoints (expected to fail)
        self.test_chat_calendar_integration()  # Test chat calendar integration
        self.test_calendar_functionality()
        self.test_task_functionality()
        self.test_task_deletion_via_chat()  # Test task deletion via chat
        self.test_memory_functionality()
        self.test_chat_functionality()
        self.test_briefing_functionality()
        self.test_briefing_with_calendar_context()  # Test briefing with calendar context
        
        # Print final results
        print(f"\n📊 FINAL RESULTS:")
        print(f"Tests passed: {self.tests_passed}/{self.tests_run}")
        print(f"Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ FAILED TESTS ({len(self.failed_tests)}):")
            for i, failure in enumerate(self.failed_tests, 1):
                print(f"{i}. {failure['test']}")
                if 'error' in failure:
                    print(f"   Error: {failure['error']}")
                else:
                    print(f"   Expected: {failure['expected']}, Got: {failure['actual']}")
                    print(f"   Response: {failure['response']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = VoxOSAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())