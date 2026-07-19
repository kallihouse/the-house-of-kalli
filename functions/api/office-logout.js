export async function onRequestPost(){
  return Response.json({ok:true},{headers:{'Cache-Control':'no-store','Set-Cookie':'kalli_office_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict'}});
}
