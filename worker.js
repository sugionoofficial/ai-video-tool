import { router } from "./router/index.js";
import { sb } from "./lib/supabase.js";

export default {
  async scheduled(
    event,
    env,
    ctx
  ) {
    ctx.waitUntil(
      sb(
        "/rest/v1/rpc/recover_stale_video_jobs",
        {
          method:
            "POST",

          body:
            JSON.stringify({
              p_max_age_minutes:
                1440
            })
        },
        env
      ).catch(
        err =>
          console.error(
            "stale job recovery failed",
            err
          )
      )
    );
  },

  async fetch(
    request,
    env,
    ctx
  ) {
    return router(
      request,
      env,
      ctx
    );
  }
};
