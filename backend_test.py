#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class RalphArenaAPITester:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.battle_id = None
        self.task_id = None

    def log(self, message: str, level: str = "INFO"):
        """Log test messages"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Optional[Dict] = None, headers: Optional[Dict] = None) -> tuple[bool, Dict]:
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if not endpoint.startswith('http') else endpoint
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        self.log(f"Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}")
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}", "ERROR")
                if response.text:
                    self.log(f"Response: {response.text[:200]}", "ERROR")

            try:
                response_data = response.json() if response.text else {}
            except:
                response_data = {"raw_response": response.text}

            return success, response_data

        except requests.exceptions.Timeout:
            self.log(f"❌ {name} - Request timeout", "ERROR")
            return False, {"error": "timeout"}
        except Exception as e:
            self.log(f"❌ {name} - Error: {str(e)}", "ERROR")
            return False, {"error": str(e)}

    def test_root_endpoint(self):
        """Test API root endpoint"""
        return self.run_test("API Root", "GET", "", 200)

    def test_get_tasks(self):
        """Test getting all tasks"""
        success, response = self.run_test("Get All Tasks", "GET", "tasks", 200)
        
        if success and isinstance(response, list):
            self.log(f"Found {len(response)} tasks")
            if len(response) >= 5:
                self.log("✅ All 5 expected tasks found")
                # Store first task for battle testing
                self.task_id = response[0]['id']
                return True, response
            else:
                self.log(f"❌ Expected 5 tasks, found {len(response)}", "ERROR")
                return False, response
        
        return success, response

    def test_get_single_task(self, task_id: str):
        """Test getting a single task"""
        return self.run_test(f"Get Task {task_id}", "GET", f"tasks/{task_id}", 200)

    def test_create_battle(self, task_id: str):
        """Test creating a new battle"""
        success, response = self.run_test(
            "Create Battle", 
            "POST", 
            "battles", 
            200,
            data={"task_id": task_id}
        )
        
        if success and 'id' in response:
            self.battle_id = response['id']
            self.log(f"Battle created with ID: {self.battle_id}")
        
        return success, response

    def test_get_battle(self, battle_id: str):
        """Test getting battle state"""
        return self.run_test(f"Get Battle {battle_id}", "GET", f"battles/{battle_id}", 200)

    def test_start_battle(self, battle_id: str):
        """Test starting a battle"""
        return self.run_test(
            "Start Battle", 
            "POST", 
            f"battles/{battle_id}/start", 
            200
        )

    def test_iterate_agent(self, battle_id: str, agent_type: str):
        """Test running an iteration for an agent"""
        return self.run_test(
            f"Iterate {agent_type.title()} Agent", 
            "POST", 
            f"battles/{battle_id}/iterate/{agent_type}", 
            200
        )

    def test_reset_battle(self, battle_id: str):
        """Test resetting a battle"""
        return self.run_test(
            "Reset Battle", 
            "POST", 
            f"battles/{battle_id}/reset", 
            200
        )

    def test_list_battles(self):
        """Test listing all battles"""
        return self.run_test("List All Battles", "GET", "battles", 200)

    def test_invalid_endpoints(self):
        """Test error handling for invalid endpoints"""
        tests = [
            ("Invalid Task ID", "GET", "tasks/invalid-id", 404),
            ("Invalid Battle ID", "GET", "battles/invalid-id", 404),
            ("Invalid Agent Type", "POST", "battles/test-id/iterate/invalid", 400),
        ]
        
        results = []
        for name, method, endpoint, expected_status in tests:
            success, _ = self.run_test(name, method, endpoint, expected_status)
            results.append(success)
        
        return all(results)

    def run_full_battle_flow(self):
        """Test complete battle flow"""
        self.log("=== Testing Full Battle Flow ===")
        
        # 1. Get tasks
        success, tasks = self.test_get_tasks()
        if not success or not tasks:
            return False
        
        # 2. Create battle
        success, battle = self.test_create_battle(self.task_id)
        if not success or not self.battle_id:
            return False
        
        # 3. Start battle
        success, _ = self.test_start_battle(self.battle_id)
        if not success:
            return False
        
        # 4. Run a few iterations for both agents
        for i in range(2):  # Test 2 iterations each
            self.log(f"--- Iteration {i+1} ---")
            
            # Traditional agent
            success, response = self.test_iterate_agent(self.battle_id, "traditional")
            if success:
                self.log(f"Traditional iteration {i+1} completed")
            
            # Ralph agent  
            success, response = self.test_iterate_agent(self.battle_id, "ralph")
            if success:
                self.log(f"Ralph iteration {i+1} completed")
        
        # 5. Get updated battle state
        success, battle_state = self.test_get_battle(self.battle_id)
        if success:
            traditional_iters = len(battle_state.get('traditional_agent', {}).get('iterations', []))
            ralph_iters = len(battle_state.get('ralph_agent', {}).get('iterations', []))
            self.log(f"Battle state: Traditional={traditional_iters} iters, Ralph={ralph_iters} iters")
        
        # 6. Reset battle
        success, _ = self.test_reset_battle(self.battle_id)
        if success:
            self.log("Battle reset successfully")
        
        return True

def main():
    """Main test runner"""
    print("🚀 Starting Ralph Loop Arena API Tests")
    print("=" * 50)
    
    tester = RalphArenaAPITester()
    
    try:
        # Basic API tests
        tester.log("=== Basic API Tests ===")
        tester.test_root_endpoint()
        
        # Task management tests
        tester.log("=== Task Management Tests ===")
        success, tasks = tester.test_get_tasks()
        if success and tasks:
            # Test getting individual tasks
            for task in tasks[:2]:  # Test first 2 tasks
                tester.test_get_single_task(task['id'])
        
        # Battle management tests
        tester.log("=== Battle Management Tests ===")
        if tester.task_id:
            tester.run_full_battle_flow()
        
        # Error handling tests
        tester.log("=== Error Handling Tests ===")
        tester.test_invalid_endpoints()
        
        # List battles
        tester.test_list_battles()
        
    except KeyboardInterrupt:
        tester.log("Tests interrupted by user", "WARNING")
    except Exception as e:
        tester.log(f"Unexpected error: {str(e)}", "ERROR")
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"❌ {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())