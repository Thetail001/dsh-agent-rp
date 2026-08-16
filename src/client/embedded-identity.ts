/** Native identity relay compiled into opaque card and Tavern Helper runtimes. */

import { AGENT_RP_EMBEDDED_IDENTITY_CHANNEL } from '../embedded-identity-protocol.ts'

/**
 * Compile the bounded MessagePort relay used by nested HTTPS service pages.
 * @param requestFunction - isolated-runtime function that requests a Host attestation.
 * @returns browser source that binds each request to its declaring iframe origin.
 */
export function embeddedNativeIdentityRelayRuntime(requestFunction: string): string {
  if (!/^__[A-Za-z0-9_]+$/u.test(requestFunction)) throw new Error('embedded identity request function is invalid')
  const channel = JSON.stringify(AGENT_RP_EMBEDDED_IDENTITY_CHANNEL)
  return `
var __dshEmbeddedIdentityPending=0;
function __dshEmbeddedIdentityFrameOrigin(source){for(var frame of document.querySelectorAll('iframe')){if(frame.contentWindow!==source)continue;var value=frame.getAttribute('src');if(!value)return;try{var parsed=new URL(value,document.baseURI);if(parsed.protocol==='https:'&&!parsed.username&&!parsed.password)return parsed.origin}catch{}return}}
function __dshEmbeddedIdentityReply(port,value){try{port.postMessage(value)}finally{try{port.close()}catch{}}}
addEventListener('message',function(event){var message=event.data;if(event.source===null||event.source===parent||!message||typeof message!=='object'||Array.isArray(message)||message.channel!==${channel}||message.action!=='request'||message.format!==0)return;var keys=Object.keys(message);if(keys.some(function(key){return !['channel','action','format','requestId','audience','nonce','includeDisplayName'].includes(key)}))return;if(typeof message.requestId!=='string'||!/^[A-Za-z0-9._:-]{1,128}$/.test(message.requestId)||typeof message.audience!=='string'||typeof message.nonce!=='string'||typeof message.includeDisplayName!=='boolean'||!Array.isArray(event.ports)||event.ports.length!==1)return;var origin=__dshEmbeddedIdentityFrameOrigin(event.source);if(origin===undefined||origin!==message.audience)return;var port=event.ports[0];if(!port||typeof port.postMessage!=='function'||typeof port.close!=='function')return;if(__dshEmbeddedIdentityPending>=16){__dshEmbeddedIdentityReply(port,{channel:${channel},action:'result',format:0,requestId:message.requestId,ok:false,error:'busy'});return}__dshEmbeddedIdentityPending+=1;Promise.resolve(${requestFunction}({audience:origin,nonce:message.nonce,includeDisplayName:message.includeDisplayName})).then(function(value){__dshEmbeddedIdentityReply(port,{channel:${channel},action:'result',format:0,requestId:message.requestId,ok:true,value:value})},function(){__dshEmbeddedIdentityReply(port,{channel:${channel},action:'result',format:0,requestId:message.requestId,ok:false,error:'identity-unavailable'})}).finally(function(){__dshEmbeddedIdentityPending-=1})});
`
}
