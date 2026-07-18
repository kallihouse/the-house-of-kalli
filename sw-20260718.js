self.addEventListener('push',event=>{
  let data={title:'The House Office',body:'The House needs your attention.',url:'/office'};
  try{data={...data,...event.data.json()}}catch{}
  event.waitUntil(self.registration.showNotification(data.title,{
    body:data.body,
    icon:'/images/house-app-icon.svg',
    badge:'/images/house-app-icon.svg',
    tag:data.tag||'house-office',
    data:{url:data.url||'/office'},
  }));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=new URL(event.notification.data?.url||'/office',self.location.origin).href;
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(async windows=>{
    for(const client of windows){
      if(client.url===target)return client.focus();
    }
    if(windows.length&&'navigate'in windows[0]){
      const client=await windows[0].navigate(target);
      return client?.focus();
    }
    return clients.openWindow(target);
  }));
});
