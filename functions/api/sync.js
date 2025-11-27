
export async function onRequestGet(context) {
  try {
    // Safety check: Ensure KV binding exists
    if (!context.env.FLATNAV_KV) {
       return new Response(JSON.stringify({ error: "KV Binding 'FLATNAV_KV' not found. Please bind it in Cloudflare Pages settings." }), { 
           status: 503,
           headers: { "Content-Type": "application/json" }
       });
    }

    // 从绑定的 KV 命名空间中读取数据
    const data = await context.env.FLATNAV_KV.get("dashboard_data");
    
    if (!data) {
      return new Response(JSON.stringify({ empty: true }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(data, {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function onRequestPost(context) {
  try {
    // Safety check: Ensure KV binding exists
    if (!context.env.FLATNAV_KV) {
       return new Response(JSON.stringify({ error: "KV Binding 'FLATNAV_KV' not found." }), { status: 503 });
    }

    const request = context.request;
    const body = await request.json();
    
    // 安全校验：只有持有正确密码（1211）的请求才允许写入数据库
    // 这里的 x-auth-token 由前端 App.tsx 发送
    const authHeader = request.headers.get("x-auth-token");
    if (authHeader !== "1211") {
      return new Response("Unauthorized", { status: 401 });
    }

    // 将数据写入 KV，设置 cacheTtl 为 60 秒（可选）
    await context.env.FLATNAV_KV.put("dashboard_data", JSON.stringify(body));

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
