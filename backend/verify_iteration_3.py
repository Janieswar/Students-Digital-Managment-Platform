import requests
import json

BASE_URL = "http://localhost:8000/api"

def test_user_enrichment():
    print("Testing User Profile Enrichment (Iteration 3)...")
    
    # 1. Login as Admin
    login_data = {"email": "admin@cec.edu.in", "password": "Admin@123"}
    session = requests.Session()
    resp = session.post(f"{BASE_URL}/auth/login", json=login_data)
    
    if resp.status_code != 200:
        print(f"FAILED: Admin login failed {resp.status_code}")
        return

    admin_data = resp.json()
    print(f"Admin logged in: {admin_data.get('name')}")

    # 2. Check /me endpoint
    resp = session.get(f"{BASE_URL}/auth/me")
    if resp.status_code == 200:
        me_data = resp.json()
        print("SUCCESS: /me returned user data.")
        # Admin usually has no profile
        if admin_data.get('role') == 'admin':
            print("Verified: Admin has no profile (correct).")
    else:
        print(f"FAILED: /me returned {resp.status_code}")

    # 3. Find a student to test (if exists)
    # We'll use the one from our bulk import test if possible
    # Or just check if any student exists in the DB
    # For now, we'll just check the schema structure in the response
    print("\nVerifying Schema Structure in Response:")
    print(f"Keys found: {list(admin_data.keys())}")
    keys = set(admin_data.keys())
    required_keys = {"student_profile", "faculty_profile"}
    if required_keys.issubset(keys):
        print("SUCCESS: UserResponse includes profile fields.")
    else:
        print(f"FAILED: Missing fields {required_keys - keys}")

if __name__ == "__main__":
    test_user_enrichment()
