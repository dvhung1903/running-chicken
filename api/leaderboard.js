import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const LB_KEY = 'dino_leaderboard';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    try {
      const lb = (await redis.get(LB_KEY)) || [];
      return res.status(200).json({ ok: true, data: lb.slice(0, 10) });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, score } = req.body;

      if (!name || typeof score !== 'number') {
        return res.status(400).json({ ok: false, error: 'Thiếu name hoặc score' });
      }
      if (name.length < 4 || name.length > 15) {
        return res.status(400).json({ ok: false, error: 'Tên phải từ 4–15 ký tự' });
      }
      if (score < 0 || score > 999999) {
        return res.status(400).json({ ok: false, error: 'Score không hợp lệ' });
      }

      let lb = (await redis.get(LB_KEY)) || [];

      const idx = lb.findIndex(e => e.name === name);
      if (idx >= 0) {
        if (score > lb[idx].score) lb[idx].score = Math.floor(score);
      } else {
        lb.push({ name, score: Math.floor(score) });
      }

      lb.sort((a, b) => b.score - a.score);

      // Giới hạn tối đa 100 người trong DB
      if (lb.length > 100) lb = lb.slice(0, 100);

      await redis.set(LB_KEY, lb);

      const rank = lb.findIndex(e => e.name === name) + 1;
      return res.status(200).json({ ok: true, rank, data: lb.slice(0, 10) });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
