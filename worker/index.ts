import handler from 'vinext/server/fetch-handler';
import {refresh} from '../lib/papers';
export default {
  fetch(request:Request,env:Cloudflare.Env,ctx:ExecutionContext){return handler.fetch(request,env,ctx)},
  async scheduled(_event:ScheduledController,_env:Cloudflare.Env,_ctx:ExecutionContext){
    const result=await refresh();
    console.log(JSON.stringify({event:'daily-paper-sync',papers:result.papers.length,added:result.added,lastSuccess:result.lastSuccess}));
  },
};
