import bcrypt from 'bcryptjs';
import { connectToDatabase } from '../config/db.js';

async function seedRoleAccounts() {
  const { db } = await connectToDatabase();
  const usersCol = db.collection('users');

  const adminHash = await bcrypt.hash('Admin@999', 10);
  const authorityHash = await bcrypt.hash('12345', 10);
  const workerHash = await bcrypt.hash('12345', 10);

  const accounts = [
    {
      user_id: 101,
      username: 'admin1',
      email: 'admin@urbandrain.local',
      full_name: 'Municipal Administrator',
      name: 'Municipal Administrator',
      role: 'Admin',
      area: 'ALL',
      area_name: 'ALL',
      assigned_areas: ['ALL'],
      assignedAreas: ['ALL'],
      is_active: true,
      password_hash: adminHash,
      password: adminHash,
      updated_at: new Date(),
    },
    {
      user_id: 102,
      username: 'authority1',
      email: 'authority@urbandrain.local',
      full_name: 'Zonal Authority Officer',
      name: 'Zonal Authority Officer',
      role: 'Authority',
      area: 'Velachery',
      area_name: 'Velachery',
      assigned_areas: ['Velachery', 'Tambaram'],
      assignedAreas: ['Velachery', 'Tambaram'],
      is_active: true,
      password_hash: authorityHash,
      password: authorityHash,
      updated_at: new Date(),
    },
    {
      user_id: 103,
      username: 'worker1',
      email: 'worker@urbandrain.local',
      full_name: 'Inspection Field Worker',
      name: 'Inspection Field Worker',
      role: 'Worker',
      area: 'Tambaram',
      area_name: 'Tambaram',
      assigned_areas: ['Tambaram'],
      assignedAreas: ['Tambaram'],
      is_active: true,
      password_hash: workerHash,
      password: workerHash,
      updated_at: new Date(),
    },
    {
      user_id: 1,
      username: 'priyadarshika',
      email: 'priyadarshika@chennai.gov.in',
      full_name: 'Priyadarshika G K',
      name: 'Priyadarshika G K',
      role: 'Admin',
      area: 'ALL',
      area_name: 'ALL',
      assigned_areas: ['ALL'],
      assignedAreas: ['ALL'],
      is_active: true,
      password_hash: adminHash,
      password: adminHash,
      updated_at: new Date(),
    },
    {
      user_id: 2,
      username: 'operator01',
      email: 'operator01@urbandrain.local',
      full_name: 'Project Operator',
      name: 'Project Operator',
      role: 'Authority',
      area: 'Velachery',
      area_name: 'Velachery',
      assigned_areas: ['Velachery'],
      assignedAreas: ['Velachery'],
      is_active: true,
      password_hash: authorityHash,
      password: authorityHash,
      updated_at: new Date(),
    },
    {
      user_id: 3,
      username: 'maint01',
      email: 'maint01@urbandrain.local',
      full_name: 'Maintenance User',
      name: 'Maintenance User',
      role: 'Worker',
      area: 'Tambaram',
      area_name: 'Tambaram',
      assigned_areas: ['Tambaram'],
      assignedAreas: ['Tambaram'],
      is_active: true,
      password_hash: workerHash,
      password: workerHash,
      updated_at: new Date(),
    },
    {
      user_id: 4,
      username: 'viewer01',
      email: 'viewer01@urbandrain.local',
      full_name: 'System Viewer',
      name: 'System Viewer',
      role: 'Worker',
      area: 'Ambattur',
      area_name: 'Ambattur',
      assigned_areas: ['Ambattur'],
      assignedAreas: ['Ambattur'],
      is_active: true,
      password_hash: workerHash,
      password: workerHash,
      updated_at: new Date(),
    },
  ];

  for (const acc of accounts) {
    await usersCol.updateOne({ username: acc.username }, { $set: acc }, { upsert: true });
    console.log(`✅ Upserted user '${acc.username}' with role '${acc.role}'`);
  }

  console.log('Role accounts seed completed successfully.');
  process.exit(0);
}

seedRoleAccounts().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
