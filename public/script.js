// Replace these with your actual project settings
const SUPABASE_URL = 'https://bmmcwlukjgfxmzxjpjwx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_b60TKX8zQ9yPaAB5xEpvuw_VmC14CGY';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.getElementById('login-btn').addEventListener('click', async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'https://ominous-giggle-r5gv45vgq6qfw76-3000.app.github.dev'
    }
  });

  if (error) {
    alert('Login failed');
    console.error(error);
  }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await supabase.auth.signOut();
  alert('Logged out');
  document.getElementById('user-info').textContent = '';
});
document.getElementById('info-btn').addEventListener('click', async () => {
  const {
  data: { session },
} = await supabase.auth.getSession();

const token = session?.access_token;
console.log(token)
});

document.getElementById('createorg-btn').addEventListener('click', async () => {
  const {
    data: { session: { access_token } },
  } = await supabase.auth.getSession();

  const res = await fetch("/api/v1/session/info", {
    method: 'POST',
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      token: access_token
    })
  });
  const data = await res.json();
  console.log(data)


  const res2 = await fetch("/api/v1/orgs/create", {
    method: 'POST',
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${access_token}`
    },
  });
  const data2 = await res2.json();
  console.log(data2)

//   const res5 = await fetch("/api/v1/orgs/write", {
//     method: 'POST',
//     headers: {
//       "Content-Type": "application/json",
//       "Authorization": `Bearer ${access_token}`
//     },
//     body:JSON.stringify({
//       organization:data2.data.id,
//       "data": {
//           "claims": {array:[1, 2, 3]},
//           "deposits": {},
//           "warehouse": {},
//           "shoppinglists": {}
//       }
//     })
//   });

//   const res4 = await fetch("/api/v1/orgs/read", {
//     method: 'POST',
//     headers: {
//       "Content-Type": "application/json",
//       "Authorization": `Bearer ${access_token}`
//     },
//     body:JSON.stringify({
//       organization:data2.data.id
//     })
//   });
//   const data4 = await res4.json();
//   console.log(data4)


//   const data5 = await res5.json();
//   console.log(data5)

//   const res3 = await fetch("/api/v1/orgs/delete", {
//     method: 'POST',
//     headers: {
//       "Content-Type": "application/json",
//       "Authorization": `Bearer ${access_token}`
//     },
//     body:JSON.stringify({
//       organization:data2.data.id
//     })
//   });
//   const data3 = await res3.json();
//   console.log(data3)


  const res6 = await fetch("/api/v1/invites/create", {
    method: 'POST',
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${access_token}`
    },
    body:JSON.stringify({
      organization:data2.data.id,
      inviterole:"member"
    })
  });
  const data6 = await res6.json();
  console.log(data6)

    const res7 = await fetch("/api/v1/invites/list", {
    method: 'POST',
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${access_token}`
    },
    body:JSON.stringify({
      organization:data2.data.id
    })
  });
  const data7 = await res7.json();
  console.log(data7)

  const res8 = await fetch("/api/v1/invites/delete", {
    method: 'POST',
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${access_token}`
    },
    body:JSON.stringify({
      invitecode:data6.data.invite
    })
  });
  const data8 = await res8.json();
  console.log(data8)


});


