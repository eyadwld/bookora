import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { config } from "dotenv";

config();

let ratelimit = null;
try {
  if (
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    ratelimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(100, "60 s"),
    });
  } else {
    console.warn("Upstash env missing — rate limiting disabled (fail-open)");
  }
} catch (err) {
  console.warn(err?.message);
  ratelimit = null;
}

export default ratelimit;
