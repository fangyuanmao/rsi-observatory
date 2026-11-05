import handler from 'vinext/server/fetch-handler';
import {readLibrary,refresh,shouldScheduledRefresh} from '../lib/papers';
export default {
  fetch(request:Request,env:Cloudflare.Env,ctx:ExecutionContext){return handler.fetch(request,env,ctx)},
  async scheduled(event:ScheduledController,_env:Cloudflare.Env,_ctx:ExecutionContext){
    try{
      const library=await readLibrary();
      if(!shouldScheduledRefresh(library,event.scheduledTime))return;
      const result=await refresh(event.scheduledTime);
      console.log(JSON.stringify({event:'daily-paper-sync',status:'success',papers:result.papers.length,added:result.added,lastSuccess:result.lastSuccess}));
    }catch(error){
      console.error(JSON.stringify({event:'daily-paper-sync',status:'failed',error:String(error),retry:'Next eligible 15-minute trigger'}));
      throw error;
    }
  },
};
