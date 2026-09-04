import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import hashlib
from database import execute_insert, execute_query

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def main():
    email = "organizer@emc.com"
    password = "org1234"
    hashed_pw = hash_password(password)

    # Check if user exists
    user = execute_query("SELECT id FROM users WHERE email = %s", (email,))
    if not user:
        user_id = execute_insert(
            "INSERT INTO users (username, email, password_hash, full_name, organization, is_active) VALUES (%s, %s, %s, %s, %s, 1)",
            ("organizer_emc", email, hashed_pw, "EMC Organizer", "EMC")
        )
    else:
        user_id = user[0]['id']
        # Update existing user password just in case
        execute_query(
            "UPDATE users SET password_hash = %s WHERE email = %s",
            (hashed_pw, email)
        )
        print("Updated existing user password.")

    # Check if role 'admin' exists
    role = execute_query("SELECT id FROM roles WHERE name = 'admin'")
    if not role:
        role_id = execute_insert("INSERT INTO roles (name, description) VALUES ('admin', 'System Administrator')")
    else:
        role_id = role[0]['id']

    # Assign role
    user_role = execute_query("SELECT * FROM user_roles WHERE user_id = %s AND role_id = %s", (user_id, role_id))
    if not user_role:
        execute_insert("INSERT INTO user_roles (user_id, role_id) VALUES (%s, %s)", (user_id, role_id))
    
    print(f"Successfully configured {email} as admin.")

if __name__ == "__main__":
    main()
