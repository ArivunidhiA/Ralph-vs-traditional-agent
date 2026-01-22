#!/usr/bin/env python3
"""
Quick script to test rate limiting on the API
"""
import requests
import time
import json

API_BASE = "http://localhost:8000/api"

def test_rate_limit():
    """Test rate limiting by making multiple requests"""
    print("Testing Rate Limiting...")
    print("=" * 50)
    
    # First, create a battle to test with
    print("\n1. Creating a battle...")
    try:
        create_response = requests.post(
            f"{API_BASE}/battles",
            json={"task_id": "todo-component"}
        )
        if create_response.status_code == 200:
            battle = create_response.json()
            battle_id = battle["id"]
            print(f"   ✓ Battle created: {battle_id}")
        else:
            print(f"   ✗ Failed to create battle: {create_response.status_code}")
            return
    except Exception as e:
        print(f"   ✗ Error: {e}")
        return
    
    # Test rate limiting on the iterate endpoint
    print(f"\n2. Testing rate limit on POST /battles/{battle_id}/iterate/traditional")
    print("   (Default limit: 10 requests/hour)")
    print("-" * 50)
    
    for i in range(12):  # Try 12 requests to exceed limit
        try:
            response = requests.post(
                f"{API_BASE}/battles/{battle_id}/iterate/traditional"
            )
            
            # Get rate limit headers
            limit = response.headers.get("X-RateLimit-Limit", "N/A")
            remaining = response.headers.get("X-RateLimit-Remaining", "N/A")
            reset = response.headers.get("X-RateLimit-Reset", "N/A")
            
            if response.status_code == 429:
                retry_after = response.headers.get("Retry-After", "N/A")
                print(f"   Request {i+1}: ❌ RATE LIMITED (429)")
                print(f"      Detail: {response.json().get('detail', 'N/A')}")
                print(f"      Retry-After: {retry_after} seconds")
                print(f"      X-RateLimit-Limit: {limit}")
                print(f"      X-RateLimit-Remaining: {remaining}")
                print(f"      X-RateLimit-Reset: {reset}")
                break
            elif response.status_code == 200:
                print(f"   Request {i+1}: ✓ Success (200)")
                print(f"      X-RateLimit-Limit: {limit}")
                print(f"      X-RateLimit-Remaining: {remaining}")
                print(f"      X-RateLimit-Reset: {reset}")
            else:
                print(f"   Request {i+1}: ⚠ Status {response.status_code}")
                print(f"      Response: {response.text[:100]}")
            
            # Small delay to avoid overwhelming
            time.sleep(0.5)
            
        except Exception as e:
            print(f"   Request {i+1}: ✗ Error: {e}")
    
    print("\n" + "=" * 50)
    print("Rate limit test complete!")
    print("\nTo test with different limits, set environment variable:")
    print("  export RATE_LIMIT_REQUESTS_PER_HOUR=5")
    print("  # Then restart the server")

if __name__ == "__main__":
    test_rate_limit()
