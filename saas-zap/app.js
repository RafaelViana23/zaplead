const SUPABASE_URL = "https://fhwxvmgtojaqnuzgctio.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZod3h2bWd0b2phcW51emdjdGlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NzI5OTQsImV4cCI6MjA4NjM0ODk5NH0.J_nT8uhCl1ShCNdtIKYOHu0ANu2emfPrQQggKMdRHsM";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
const content = document.getElementById("content");
const pageTitle = document.getElementById("pageTitle");
const links = document.querySelectorAll(".sidebar nav a");

/* ================= NAVEGAÇÃO ================= */
links.forEach(link => {
    link.addEventListener("click", e => {
        e.preventDefault();
        links.forEach(l => l.classList.remove("active"));
        link.classList.add("active");
        loadPage(link.dataset.page);
    });
});

function loadPage(page) {
    if (!currentUser) return showLogin();
    content.innerHTML = '<p style="text-align:center; opacity:0.5;">Carregando...</p>';

    if (page === "dashboard") showDashboard();
    if (page === "ai") showAIConfig();
    if (page === "leads") showLeads();
    if (page === "integrations") showIntegrations();
}

/* ================= DASHBOARD ================= */
async function showDashboard() {
    pageTitle.textContent = "Dashboard";
    const { count } = await supabaseClient.from("leads").select("*", { count: "exact", head: true }).eq("user_id", currentUser.id);

    content.innerHTML = `
    <section class="cards" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
      <div class="card"><h3 style="color: #94a3b8; font-size: 14px;">Status</h3><p style="color: #22c55e; font-weight: bold; margin-top: 10px;">🟢 Conectado</p></div>
      <div class="card"><h3 style="color: #94a3b8; font-size: 14px;">Total Leads</h3><p style="font-size: 32px; font-weight: bold; margin-top: 10px;">${count || 0}</p></div>
      <div class="card"><h3 style="color: #94a3b8; font-size: 14px;">Logout</h3><button id="logoutBtn" style="background:#ef4444; margin-top:10px; width:100%">Sair do Sistema</button></div>
    </section>`;

    document.getElementById("logoutBtn").onclick = handleLogout;
}

/* ================= GESTÃO DE LEADS (COM DELETE) ================= */
async function showLeads() {
    pageTitle.textContent = "Leads Capturados";
    const { data: leads } = await supabaseClient.from("leads").select("*").eq("user_id", currentUser.id).order("created_at", { ascending: false });

    let rows = leads?.map(lead => `
      <tr>
        <td>${lead.name}</td>
        <td>${lead.phone}</td>
        <td><span style="background: rgba(59, 130, 246, 0.1); color: #60a5fa; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${lead.interest || 'Geral'}</span></td>
        <td style="color: #64748b;">${new Date(lead.created_at).toLocaleDateString()}</td>
        <td><button class="delete-btn" data-id="${lead.id}" style="background:transparent; color:#ef4444; border:1px solid #ef4444; padding: 4px 8px; font-size:12px;">Apagar</button></td>
      </tr>`).join("");

    content.innerHTML = `
      <section class="panel">
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 15px; align-items: end; margin-bottom: 40px; background: rgba(255,255,255,0.02); padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
          <input type="text" id="newLeadName" placeholder="Nome">
          <input type="text" id="newLeadPhone" placeholder="WhatsApp">
          <input type="text" id="newLeadInterest" placeholder="Interesse">
          <button id="addLeadBtn" style="height: 44px;">Add Lead</button>
        </div>
        <table class="table">
          <thead><tr><th>Nome</th><th>Telefone</th><th>Interesse</th><th>Data</th><th>Ação</th></tr></thead>
          <tbody>${rows || "<tr><td colspan='5' style='text-align:center;'>Nenhum lead encontrado</td></tr>"}</tbody>
        </table>
      </section>`;

    // Lógica para Adicionar
    document.getElementById("addLeadBtn").onclick = async () => {
        const { error } = await supabaseClient.from("leads").insert([{ 
            name: document.getElementById("newLeadName").value, 
            phone: document.getElementById("newLeadPhone").value, 
            interest: document.getElementById("newLeadInterest").value,
            user_id: currentUser.id 
        }]);
        if (error) alert(error.message); else showLeads();
    };

    // Lógica para Apagar (Event Delegation)
    document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.onclick = async () => {
            if (confirm("Tem a certeza que deseja eliminar este lead?")) {
                const id = btn.dataset.id;
                const { error } = await supabaseClient.from("leads").delete().eq("id", id);
                if (error) alert(error.message); else showLeads();
            }
        };
    });
}

/* ================= CONFIG IA (LAYOUT MELHORADO) ================= */
async function showAIConfig() {
    pageTitle.textContent = "Configurar Atendente IA";
    const { data } = await supabaseClient
        .from("settings")
        .select("*")
        .eq("user_id", currentUser.id)
        .maybeSingle();

    content.innerHTML = `
    <section class="panel">
      <div style="max-width: 650px;">
        <h2 style="margin-bottom: 25px; font-size: 1.2rem; color: #38bdf8;">Personalidade da IA</h2>
        
        <div style="margin-bottom: 20px;">
          <label style="display: block; font-size: 13px; font-weight: 600; color: #94a3b8; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
            Mensagem de Boas-Vindas
          </label>
          <textarea id="welcomeMsg" rows="3" placeholder="Ex: Olá! Sou o assistente virtual da ZapLead. Em que posso ajudar hoje?">${data?.welcome_message || ""}</textarea>
          <p style="font-size: 12px; color: #64748b; margin-top: 6px;">Essa é a primeira mensagem que o cliente receberá no WhatsApp.</p>
        </div>

        <div style="margin-bottom: 25px;">
          <label style="display: block; font-size: 13px; font-weight: 600; color: #94a3b8; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
            Sobre seu negócio (Contexto)
          </label>
          <textarea id="businessInfo" rows="6" placeholder="Ex: Somos uma imobiliária em São Paulo especializada em aluguéis de luxo. Nossos horários são...">${data?.business_info || ""}</textarea>
          <p style="font-size: 12px; color: #64748b; margin-top: 6px;">Ensine a IA sobre seus produtos, preços e horários para que ela responda com precisão.</p>
        </div>

        <button id="saveSettings" style="width: 100%; max-width: 250px; padding: 14px; font-size: 14px;">
          Gravar Configurações
        </button>
      </div>
    </section>`;

    document.getElementById("saveSettings").onclick = async () => {
        const btn = document.getElementById("saveSettings");
        const originalText = btn.innerText;
        
        btn.innerText = "Salvando alterações...";
        btn.style.opacity = "0.7";
        btn.disabled = true;

        const { error } = await supabaseClient.from("settings").upsert({
            user_id: currentUser.id,
            welcome_message: document.getElementById("welcomeMsg").value,
            business_info: document.getElementById("businessInfo").value
        });

        setTimeout(() => {
            btn.innerText = originalText;
            btn.style.opacity = "1";
            btn.disabled = false;
            if (error) alert("Erro ao salvar: " + error.message);
            else alert("Configurações salvas com sucesso! ✨");
        }, 800);
    };
}

/* ================= INTEGRAÇÕES ================= */
function showIntegrations() {
    pageTitle.textContent = "Integrações";
    content.innerHTML = `<section class="panel" style="text-align:center; padding:40px;"><h2>Em breve</h2><p>Conexão direta com API do WhatsApp.</p></section>`;
}

/* ================= LOGIN & SESSÃO ================= */
function showLogin() {
    pageTitle.textContent = "Acesso";
    content.innerHTML = `
      <div class="panel" style="max-width:400px; margin: 40px auto;">
        <h2>Entrar</h2>
        <input type="email" id="email" placeholder="E-mail" />
        <input type="password" id="password" placeholder="Senha" />
        <button id="loginBtn" style="width: 100%; margin-top: 10px;">Entrar</button>
        <p id="msg" style="color: #ef4444; text-align: center; margin-top: 10px;"></p>
      </div>`;

    document.getElementById("loginBtn").onclick = async () => {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: document.getElementById("email").value,
            password: document.getElementById("password").value
        });
        if (error) document.getElementById("msg").innerText = error.message;
        else { currentUser = data.user; loadPage("dashboard"); }
    };
}

async function handleLogout() {
    await supabaseClient.auth.signOut();
    currentUser = null;
    showLogin();
}

async function checkUser() {
    const { data } = await supabaseClient.auth.getUser();
    if (data?.user) { currentUser = data.user; loadPage("dashboard"); }
    else showLogin();
}

checkUser();