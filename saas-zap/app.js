/* ================= CONFIGURAÇÕES SUPABASE ================= */
const SUPABASE_URL = "https://fhwxvmgtojaqnuzgctio.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZod3h2bWd0b2phcW51emdjdGlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NzI5OTQsImV4cCI6MjA4NjM0ODk5NH0.J_nT8uhCl1ShCNdtIKYOHu0ANu2emfPrQQggKMdRHsM";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ================= VARIÁVEIS GLOBAIS ================= */
let currentUser = null;
let editingLeadId = null; // Para controle de edição
const appRoot = document.getElementById("appRoot");
const content = document.getElementById("content");
const pageTitle = document.getElementById("pageTitle");

/* ================= INICIALIZAÇÃO E NAVEGAÇÃO ================= */
document.querySelectorAll(".sidebar nav a").forEach(link => {
    link.addEventListener("click", e => {
        e.preventDefault();
        document.querySelectorAll(".sidebar nav a").forEach(l => l.classList.remove("active"));
        link.classList.add("active");
        loadPage(link.dataset.page);
    });
});

async function loadPage(page) {
    if (!currentUser) return showLogin();
    
    editingLeadId = null; // Reseta edição ao mudar de página
    appRoot.classList.remove("logged-out");
    content.innerHTML = '<div style="opacity:0.5; padding:20px;">Carregando...</div>';

    switch(page) {
        case "dashboard": await showDashboard(); break;
        case "ai": await showAIConfig(); break;
        case "leads": await showLeads(); break;
        case "integrations": showIntegrations(); break;
    }
}

/* ================= AUTENTICAÇÃO (LOGIN E CADASTRO) ================= */
async function checkUser() {
    const { data } = await supabaseClient.auth.getUser();
    if (data?.user) {
        currentUser = data.user;
        document.getElementById("userEmail").innerText = currentUser.email;
        
        document.getElementById("logoutBtn").onclick = async () => {
            await supabaseClient.auth.signOut();
            location.reload();
        };
        
        loadPage("dashboard");
    } else {
        showLogin();
    }
}

function showLogin(isSignUp = false) {
    appRoot.classList.add("logged-out");
    pageTitle.innerText = "";
    
    const title = isSignUp ? "Criar Conta ZapLead" : "Acessar ZapLead";
    const btnText = isSignUp ? "Registrar Agora" : "Entrar no Sistema";
    const toggleText = isSignUp ? "Já tem conta? Faça Login" : "Não tem conta? Cadastre-se grátis";

    content.innerHTML = `
      <div class="panel" style="max-width:380px; width:100%;">
        <h2 style="text-align:center; margin-bottom:20px; color:#38bdf8;">${title}</h2>
        <label>E-mail</label>
        <input type="email" id="email" placeholder="seu@email.com">
        <label style="margin-top:15px;">Senha</label>
        <input type="password" id="password" placeholder="••••••••">
        <button id="authBtn" style="width:100%; margin-top:25px;">${btnText}</button>
        <p id="toggleAuth" style="color:#38bdf8; font-size:13px; margin-top:20px; text-align:center; cursor:pointer; text-decoration:underline;">
            ${toggleText}
        </p>
        <p id="msg" style="color:#ef4444; font-size:13px; margin-top:15px; text-align:center;"></p>
      </div>`;

    document.getElementById("toggleAuth").onclick = () => showLogin(!isSignUp);

    document.getElementById("authBtn").onclick = async () => {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        const msg = document.getElementById("msg");

        if (isSignUp) {
            const { data, error } = await supabaseClient.auth.signUp({ email, password });
            if (error) msg.innerText = "Erro: " + error.message;
            else alert("Sucesso! Verifique seu e-mail (se habilitado) ou tente logar.");
        } else {
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) msg.innerText = "E-mail ou senha incorretos.";
            else { currentUser = data.user; checkUser(); }
        }
    };
}

/* ================= DASHBOARD ================= */
async function showDashboard() {
    pageTitle.innerText = "Resumo Geral";
    const { count } = await supabaseClient.from("leads").select("*", { count: "exact", head: true }).eq("user_id", currentUser.id);
    
    content.innerHTML = `
    <div class="grid-container">
        <div class="card"><label>Status</label><h2 style="color:#22c55e;">🟢 Online</h2></div>
        <div class="card"><label>Total de Leads</label><h2>${count || 0}</h2></div>
        <div class="card"><label>IA Ativa</label><h2>Sim</h2></div>
    </div>`;
}

/* ================= GESTÃO DE LEADS (CRUD) ================= */
async function showLeads() {
    pageTitle.innerText = "Gestão de Leads";
    const { data: leads } = await supabaseClient.from("leads").select("*").eq("user_id", currentUser.id).order("created_at", { ascending: false });

    let rows = leads?.map(l => `
        <tr>
            <td>${l.name}</td>
            <td>${l.phone}</td>
            <td><span style="color:#38bdf8">${l.interest || 'Geral'}</span></td>
            <td>
                <button style="background:#f59e0b; padding:5px 10px; font-size:11px; margin-right:5px;" onclick="editLead('${l.id}', '${l.name}', '${l.phone}', '${l.interest || ''}')">Editar</button>
                <button class="btn-logout" style="padding:5px 10px; font-size:11px" onclick="deleteLead('${l.id}')">Excluir</button>
            </td>
        </tr>`).join("") || "<tr><td colspan='4' style='text-align:center; opacity:0.5;'>Nenhum lead encontrado.</td></tr>";

    content.innerHTML = `
    <div class="panel">
        <h3 id="formTitle" style="margin-bottom:20px; font-size:16px;">Novo Lead Manual</h3>
        <div class="form-row">
            <div class="form-group"><label>Nome</label><input type="text" id="ln"></div>
            <div class="form-group"><label>WhatsApp</label><input type="text" id="lp"></div>
            <div class="form-group"><label>Interesse</label><input type="text" id="li"></div>
            <button id="btnSave" style="height: 44px;">+ Adicionar</button>
            <button id="btnCancel" style="height: 44px; background:transparent; border:1px solid #334155; display:none;">Cancelar</button>
        </div>
        <table class="table">
            <thead><tr><th>Nome</th><th>WhatsApp</th><th>Interesse</th><th>Ações</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
    </div>`;

    document.getElementById("btnSave").onclick = async () => {
        const payload = {
            name: document.getElementById("ln").value,
            phone: document.getElementById("lp").value,
            interest: document.getElementById("li").value,
            user_id: currentUser.id
        };

        if(!payload.name || !payload.phone) return alert("Preencha Nome e WhatsApp!");

        if (editingLeadId) {
            await supabaseClient.from("leads").update(payload).eq("id", editingLeadId);
            editingLeadId = null;
        } else {
            await supabaseClient.from("leads").insert([payload]);
        }
        showLeads();
    };

    document.getElementById("btnCancel").onclick = () => { editingLeadId = null; showLeads(); };
}

window.editLead = (id, name, phone, interest) => {
    editingLeadId = id;
    document.getElementById("ln").value = name;
    document.getElementById("lp").value = phone;
    document.getElementById("li").value = interest;
    document.getElementById("formTitle").innerText = "Editando: " + name;
    document.getElementById("btnSave").innerText = "Salvar Alterações";
    document.getElementById("btnSave").style.background = "#f59e0b";
    document.getElementById("btnCancel").style.display = "inline-block";
    document.getElementById("formTitle").scrollIntoView({ behavior: 'smooth' });
};

window.deleteLead = async (id) => {
    if(confirm("Excluir este lead permanentemente?")) {
        await supabaseClient.from("leads").delete().eq("id", id);
        showLeads();
    }
};

/* ================= CONFIG IA ================= */
async function showAIConfig() {
    pageTitle.innerText = "Treinamento da IA";
    const { data } = await supabaseClient.from("settings").select("*").eq("user_id", currentUser.id).maybeSingle();

    content.innerHTML = `
    <div class="panel" style="max-width:700px">
        <label>Sobre o seu Negócio</label>
        <textarea id="bi" rows="8" placeholder="Ex: Somos uma imobiliária que vende casas no interior...">${data?.business_info || ""}</textarea>
        <button id="svAI" style="width:100%; margin-top:20px;">Salvar Treinamento</button>
    </div>`;

    document.getElementById("svAI").onclick = async () => {
        await supabaseClient.from("settings").upsert({ 
            user_id: currentUser.id, 
            business_info: document.getElementById("bi").value 
        });
        alert("IA Treinada!");
    };
}

function showIntegrations() {
    pageTitle.innerText = "Conexões";
    content.innerHTML = `<div class="panel" style="text-align:center; padding:50px;"><h3>WhatsApp QR Code</h3><p style="opacity:0.6; margin-top:10px;">Integração em desenvolvimento para a versão 2.0.</p></div>`;
}

/* ================= START ================= */
checkUser();
