import csv
from pathlib import Path

CONFLICT_IDS = {
    "888578f3-5d1e-442f-b82f-16df7de70965",
    "d71d3978-1a6b-483e-a453-30952df2dfcd",
    "310a66a9-2496-4a3b-aab4-ff473d59cba2",
    "3c1dd886-6662-4c1a-81db-924aa9c4d713",
    "e4bd2c67-5f6e-43eb-889a-599b52ca0a10",
    "db7a4835-5477-4697-b082-e75d2e455065",
    "2e4502ee-9d26-4217-8cd0-5b9ef013f2a1",
    "a12d5fc9-292f-4fe0-a6e5-3962aa66f47b",
    "b52e47a1-4083-414b-985d-bfcd5a873803",
}

source_csv = Path("migration_data/orphan_profiles_email_template.csv")
auth_tsv = Path("migration_data/auth_users_id_email.tsv")
out_targets = Path("migration_data/migrated_users_reset_targets.tsv")
out_emails = Path("migration_data/migrated_users_reset_emails_exact.txt")

wanted_ids = []
with source_csv.open() as f:
    for row in csv.DictReader(f):
        profile_id = (row.get("profile_id") or "").strip()
        if profile_id and profile_id not in CONFLICT_IDS:
            wanted_ids.append(profile_id)

wanted_set = set(wanted_ids)
rows = []
with auth_tsv.open() as f:
    for line in f:
        parts = line.rstrip("\n").split("\t")
        if len(parts) < 2:
            continue
        user_id = parts[0].strip()
        email = parts[1].strip()
        if user_id in wanted_set and email:
            rows.append((user_id, email))

out_targets.write_text("".join(f"{uid}\t{email}\n" for uid, email in rows))
out_emails.write_text("".join(f"{email}\n" for _, email in rows))

print("target_ids", len(wanted_set))
print("matched_auth_rows", len(rows))
