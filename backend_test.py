import requests
import sys
import json
from datetime import datetime, timedelta

class EventHiveAPITester:
    def __init__(self, base_url="https://eventhive-3.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.created_event_id = None

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "status": "PASSED" if success else "FAILED",
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                try:
                    error_data = response.json()
                    details += f", Response: {error_data}"
                except:
                    details += f", Response: {response.text}"
            
            self.log_test(name, success, details)
            
            if success:
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API Endpoint", "GET", "", 200)

    def test_get_events_empty(self):
        """Test getting events when none exist"""
        success, response = self.run_test("Get Events (Empty)", "GET", "events", 200)
        if success and isinstance(response, list):
            return True, response
        return False, {}

    def test_create_event(self):
        """Test creating a new event"""
        tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        event_data = {
            "name": "Test Conference 2025",
            "date": tomorrow,
            "location": "Tech Hub, San Francisco",
            "description": "A comprehensive technology conference featuring the latest innovations in AI, blockchain, and web development."
        }
        
        success, response = self.run_test("Create Event", "POST", "events", 201, event_data)
        if success and 'id' in response:
            self.created_event_id = response['id']
            return True, response
        return False, {}

    def test_get_events_with_data(self):
        """Test getting events when data exists"""
        success, response = self.run_test("Get Events (With Data)", "GET", "events", 200)
        if success and isinstance(response, list) and len(response) > 0:
            return True, response
        return False, {}

    def test_get_single_event(self):
        """Test getting a single event by ID"""
        if not self.created_event_id:
            self.log_test("Get Single Event", False, "No event ID available")
            return False, {}
        
        return self.run_test("Get Single Event", "GET", f"events/{self.created_event_id}", 200)

    def test_search_events(self):
        """Test searching events"""
        return self.run_test("Search Events", "GET", "events", 200, params={"search": "Conference"})

    def test_update_event(self):
        """Test updating an event"""
        if not self.created_event_id:
            self.log_test("Update Event", False, "No event ID available")
            return False, {}
        
        update_data = {
            "name": "Updated Test Conference 2025",
            "description": "Updated description for the technology conference."
        }
        
        return self.run_test("Update Event", "PUT", f"events/{self.created_event_id}", 200, update_data)

    def test_register_for_event(self):
        """Test registering for an event"""
        if not self.created_event_id:
            self.log_test("Register for Event", False, "No event ID available")
            return False, {}
        
        registration_data = {
            "event_id": self.created_event_id,
            "name": "John Doe",
            "email": "john.doe@example.com"
        }
        
        return self.run_test("Register for Event", "POST", "register", 201, registration_data)

    def test_duplicate_registration(self):
        """Test duplicate registration (should fail)"""
        if not self.created_event_id:
            self.log_test("Duplicate Registration", False, "No event ID available")
            return False, {}
        
        registration_data = {
            "event_id": self.created_event_id,
            "name": "John Doe",
            "email": "john.doe@example.com"
        }
        
        # This should return 400 (Bad Request) for duplicate registration
        success, response = self.run_test("Duplicate Registration (Should Fail)", "POST", "register", 400, registration_data)
        return success, response

    def test_get_registrations(self):
        """Test getting registrations for an event"""
        if not self.created_event_id:
            self.log_test("Get Event Registrations", False, "No event ID available")
            return False, {}
        
        success, response = self.run_test("Get Event Registrations", "GET", f"registrations/{self.created_event_id}", 200)
        if success and 'count' in response and response['count'] >= 1:
            return True, response
        return False, {}

    def test_admin_login_valid(self):
        """Test admin login with valid credentials"""
        credentials = {
            "username": "admin",
            "password": "admin123"
        }
        
        return self.run_test("Admin Login (Valid)", "POST", "admin/login", 200, credentials)

    def test_admin_login_invalid(self):
        """Test admin login with invalid credentials"""
        credentials = {
            "username": "admin",
            "password": "wrongpassword"
        }
        
        # This should return 401 (Unauthorized)
        return self.run_test("Admin Login (Invalid)", "POST", "admin/login", 401, credentials)

    def test_register_nonexistent_event(self):
        """Test registering for non-existent event"""
        registration_data = {
            "event_id": "nonexistent-id",
            "name": "Jane Doe",
            "email": "jane.doe@example.com"
        }
        
        # This should return 404 (Not Found)
        return self.run_test("Register for Non-existent Event", "POST", "register", 404, registration_data)

    def test_delete_event(self):
        """Test deleting an event"""
        if not self.created_event_id:
            self.log_test("Delete Event", False, "No event ID available")
            return False, {}
        
        return self.run_test("Delete Event", "DELETE", f"events/{self.created_event_id}", 200)

    def test_get_deleted_event(self):
        """Test getting a deleted event (should fail)"""
        if not self.created_event_id:
            self.log_test("Get Deleted Event", False, "No event ID available")
            return False, {}
        
        # This should return 404 (Not Found)
        return self.run_test("Get Deleted Event (Should Fail)", "GET", f"events/{self.created_event_id}", 404)

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting EventHive API Tests...")
        print(f"Testing against: {self.base_url}")
        print("=" * 50)

        # Basic API tests
        self.test_root_endpoint()
        self.test_get_events_empty()
        
        # Event CRUD operations
        self.test_create_event()
        self.test_get_events_with_data()
        self.test_get_single_event()
        self.test_search_events()
        self.test_update_event()
        
        # Registration tests
        self.test_register_for_event()
        self.test_duplicate_registration()
        self.test_get_registrations()
        
        # Admin tests
        self.test_admin_login_valid()
        self.test_admin_login_invalid()
        
        # Error handling tests
        self.test_register_nonexistent_event()
        
        # Cleanup tests
        self.test_delete_event()
        self.test_get_deleted_event()

        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("⚠️  Some tests failed. Check the details above.")
            return 1

def main():
    tester = EventHiveAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())