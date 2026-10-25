import * as OTPAuth from 'otpauth';
import { pool, transaction, audit } from './db.js';
import { hashPassword, encrypt } from './security.js';
import { password, email } from './schemas.js';
const address = email.parse(process.env.ADMIN_EMAIL);
const pass = password.parse(process.env.ADMIN_PASSWORD);
const name = process.env.ADMIN_NAME || 'SEES administrator';
const totp = new OTPAuth.TOTP({ issuer: 'SEES UNILAG', label: address, secret: new OTPAuth.Secret({ size: 20 }) });
const hash = await hashPassword(pass);
await transaction(async (db) => { await db.query('SELECT pg_advisory_xact_lock(20261025)'); const count = (await db.query('SELECT COUNT(*)::INTEGER AS n FROM admins')).rows[0].n; if (count)
    throw new Error('Initial bootstrap is disabled: an admin already exists.'); const { rows } = await db.query("INSERT INTO admins(email,name,password_hash,role,mfa_secret) VALUES($1,$2,$3,'super_admin',$4) RETURNING id", [address, name, hash, encrypt(totp.secret.base32)]); await audit(db, rows[0].id, 'admin.bootstrapped', rows[0].id); });
console.log('Add this private enrollment URI to your authenticator, then remove it from terminal history:');
console.log(totp.toString());
await pool.end();
