const encoder=new TextEncoder();
const PUBLIC_KEY='BFU8uZBTRC7SyjQHeSMTwfF82XzYDVqZMdRvsyvAXBMP38iSsijhTADETsmv8qEbzr_hW2Ki9qCvluOm3KcKClE';
const b64u=bytes=>{let value='';for(const byte of bytes)value+=String.fromCharCode(byte);return btoa(value).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'')};
const fromB64u=value=>{const base=String(value).replaceAll('-','+').replaceAll('_','/'),padded=base+'='.repeat((4-base.length%4)%4),raw=atob(padded);return Uint8Array.from(raw,c=>c.charCodeAt(0))};
const concat=(...values)=>{const size=values.reduce((n,v)=>n+v.length,0),out=new Uint8Array(size);let at=0;for(const value of values){out.set(value,at);at+=value.length}return out};
const hmac=async(key,data)=>new Uint8Array(await crypto.subtle.sign('HMAC',await crypto.subtle.importKey('raw',key,{name:'HMAC',hash:'SHA-256'},false,['sign']),data));
const hkdf=async(salt,ikm,info,length)=>{const prk=await hmac(salt,ikm),result=new Uint8Array(length);let previous=new Uint8Array(),at=0,counter=1;while(at<length){previous=await hmac(prk,concat(previous,info,Uint8Array.of(counter++)));result.set(previous.slice(0,Math.min(previous.length,length-at)),at);at+=Math.min(previous.length,length-at)}return result};
const uint32=value=>new Uint8Array([(value>>>24)&255,(value>>>16)&255,(value>>>8)&255,value&255]);

const vapidToken=async(endpoint,env)=>{
  const jwk=JSON.parse(env.VAPID_PRIVATE_JWK),now=Math.floor(Date.now()/1000);
  const header=b64u(encoder.encode(JSON.stringify({typ:'JWT',alg:'ES256'})));
  const payload=b64u(encoder.encode(JSON.stringify({aud:new URL(endpoint).origin,exp:now+43200,sub:'https://thehouseofkalli.com'})));
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
  const signature=new Uint8Array(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,encoder.encode(`${header}.${payload}`)));
  return `${header}.${payload}.${b64u(signature)}`;
};

const encrypt=async(subscription,payload)=>{
  const clientPublic=fromB64u(subscription.p256dh),auth=fromB64u(subscription.auth),salt=crypto.getRandomValues(new Uint8Array(16));
  const clientKey=await crypto.subtle.importKey('raw',clientPublic,{name:'ECDH',namedCurve:'P-256'},false,[]);
  const serverKeys=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
  const serverPublic=new Uint8Array(await crypto.subtle.exportKey('raw',serverKeys.publicKey));
  const shared=new Uint8Array(await crypto.subtle.deriveBits({name:'ECDH',public:clientKey},serverKeys.privateKey,256));
  const keyInfo=concat(encoder.encode('WebPush: info\0'),clientPublic,serverPublic);
  const ikm=await hkdf(auth,shared,keyInfo,32);
  const cek=await hkdf(salt,ikm,encoder.encode('Content-Encoding: aes128gcm\0'),16);
  const nonce=await hkdf(salt,ikm,encoder.encode('Content-Encoding: nonce\0'),12);
  const aes=await crypto.subtle.importKey('raw',cek,'AES-GCM',false,['encrypt']);
  const plaintext=concat(encoder.encode(JSON.stringify(payload)),Uint8Array.of(2));
  const ciphertext=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce},aes,plaintext));
  return concat(salt,uint32(4096),Uint8Array.of(serverPublic.length),serverPublic,ciphertext);
};

const sendOne=async(env,subscription,payload)=>{
  const body=await encrypt(subscription,payload),token=await vapidToken(subscription.endpoint,env);
  return fetch(subscription.endpoint,{method:'POST',headers:{TTL:'86400',Urgency:'normal','Content-Encoding':'aes128gcm','Content-Type':'application/octet-stream',Authorization:`vapid t=${token}, k=${PUBLIC_KEY}`},body});
};

export async function sendHousePush(env,payload){
  if(!env.DB||!env.VAPID_PRIVATE_JWK)return;
  const rows=await env.DB.prepare('SELECT endpoint,p256dh,auth FROM office_push_subscriptions').all();
  await Promise.allSettled((rows.results||[]).map(async subscription=>{
    try{
      const response=await sendOne(env,subscription,payload);
      if(response.status===404||response.status===410)await env.DB.prepare('DELETE FROM office_push_subscriptions WHERE endpoint=?').bind(subscription.endpoint).run();
    }catch{}
  }));
}
