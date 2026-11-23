import sqlite3
import uuid
from datetime import datetime

auth_conn = sqlite3.connect('services/auth-service/data/auth.db')
auth_conn.row_factory = sqlite3.Row
cur = auth_conn.cursor()

pay_conn = sqlite3.connect('services/payment-service/data/payment.db')
pay_cur = pay_conn.cursor()

# 1. Update any 'pro' or 'standard' in auth.db to 'PRO_YEAR' or 'PRO_MONTH'
cur.execute("UPDATE users SET plan_tier = 'PRO_YEAR' WHERE plan_tier = 'pro' AND plan_expires_at > '2027-01-01'")
cur.execute("UPDATE users SET plan_tier = 'PRO_MONTH' WHERE plan_tier IN ('pro', 'standard')")
cur.execute("UPDATE users SET plan_tier = 'ENTERPRISE' WHERE plan_tier = 'enterprise'")
auth_conn.commit()

# 2. Sync users with active plans into payment.db subscriptions
cur.execute("SELECT id, email, role, plan_tier, plan_expires_at FROM users WHERE plan_tier IN ('PRO_MONTH', 'PRO_YEAR', 'ENTERPRISE')")
users = cur.fetchall()

now_str = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')

for u in users:
    uid = u['id']
    tier = u['plan_tier']
    exp = u['plan_expires_at']
    # Check if active subscription exists
    pay_cur.execute('SELECT id FROM subscriptions WHERE user_id = ? AND status = ?', (uid, 'active'))
    existing = pay_cur.fetchone()
    if not existing:
        plan_id = 'plan_pro_yearly' if tier == 'PRO_YEAR' else 'plan_pro_monthly' if tier == 'PRO_MONTH' else 'plan_enterprise'
        sub_id = f'sub_sync_{uuid.uuid4().hex[:10]}'
        pay_cur.execute(
            'INSERT INTO subscriptions (id, user_id, plan_id, plan_code, status, starts_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            (sub_id, uid, plan_id, tier, 'active', now_str, exp)
        )
        pay_cur.execute('UPDATE user_quotas SET plan_code = ? WHERE user_id = ?', (tier, uid))
        print(f"Synced subscription for {u['email']} ({tier})")

pay_conn.commit()
auth_conn.close()
pay_conn.close()
print("Migration and sync complete!")
