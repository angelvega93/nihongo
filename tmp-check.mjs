import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL);
try {
	const rows = await sql`SELECT c.id, c.state, c.reps, c.due, c.stability, c.difficulty, n.metadata->>'word' as word FROM cards c JOIN notes n ON n.id = c.note_id WHERE n.metadata->>'word' = '食べる'`;
	console.log(JSON.stringify(rows, null, 2));
	const logs = await sql`SELECT * FROM rev_log`;
	console.log(JSON.stringify(logs, null, 2));
} finally {
	await sql.end();
}
