document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const messagesContainer = document.getElementById('chat-messages');

    // CONFIGURACIÓN: Carga la llave desde config.js o localStorage
    let API_KEY = window.CONFIG?.API_KEY || localStorage.getItem('gemini_api_key') || "";

    const getSystemPrompt = async () => {
        try {
            const response = await fetch('prompt_sistema.md');
            return await response.text();
        } catch (error) {
            console.error("No se pudo cargar el prompt de sistema:", error);
            return "Eres un tutor de ingeniería experto.";
        }
    };

    const callGeminiAPI = async (userText) => {
        if (!API_KEY) {
            return "ERROR: No se ha detectado una API Key. Por favor, ve a la sección de [Ajustes] y configura tu llave de Google AI Studio para activar el cerebro de la IA.";
        }

        const systemPrompt = await getSystemPrompt();

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        role: "user",
                        parts: [{ text: `CONTEXTO DEL SISTEMA:\n${systemPrompt}\n\nPREGUNTA DEL ESTUDIANTE: ${userText}` }]
                    }]
                })
            });

            const data = await response.json();

            if (!response.ok) {
                console.error("Error de la API:", data);
                return `ERROR DE IA: ${data.error?.message || "La clave de API no es válida o hay un problema de cuota."}`;
            }

            if (data.candidates && data.candidates[0]) {
                return data.candidates[0].content.parts[0].text;
            } else {
                return "La IA no pudo generar una respuesta. Intenta reformular tu pregunta.";
            }
        } catch (error) {
            console.error("Error en la conexión con Gemini:", error);
            return "Lo siento, tuve un problema de conexión con mi red neuronal. Verifica que tu API Key sea correcta en config.js y que hayas guardado el archivo.";
        }
    };

    const addMessage = (text, sender) => {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender);

        const content = document.createElement('div');
        content.classList.add('message-content');
        content.textContent = text;

        const time = document.createElement('span');
        time.classList.add('message-time');
        const now = new Date();
        time.textContent = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

        messageDiv.appendChild(content);

        if (sender === 'mentor') {
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-btn';
            copyBtn.innerHTML = '<span>Copiar</span>';
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(text).then(() => {
                    const originalText = copyBtn.innerHTML;
                    copyBtn.innerHTML = '<span>¡Copiado!</span>';
                    copyBtn.classList.add('copied');
                    setTimeout(() => {
                        copyBtn.innerHTML = originalText;
                        copyBtn.classList.remove('copied');
                    }, 2000);
                });
            };
            messageDiv.appendChild(copyBtn);
        }

        messageDiv.appendChild(time);
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    };

    // NAVEGACIÓN
    const navItems = document.querySelectorAll('.nav-item');
    const contentViews = document.querySelectorAll('.content-view');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.getAttribute('data-target');

            // Si no tiene target (como Ajustes), no hacemos nada por ahora
            if (!target) return;

            // Actualizar clase activa en menú
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            // Cambiar vista activa
            contentViews.forEach(view => {
                view.classList.remove('active');
                if (view.id === target) {
                    view.classList.add('active');
                }
            });
        });
    });

    // LÓGICA DE TEMA (CLARO/OSCURO)
    const themeToggle = document.getElementById('theme-toggle');
    const themeLabel = document.getElementById('theme-label');

    // Cargar preferencia guardada
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'light') {
        document.body.classList.add('light-mode');
        themeToggle.checked = true;
        themeLabel.textContent = "Modo Claro";
    }

    themeToggle.addEventListener('change', () => {
        if (themeToggle.checked) {
            document.body.classList.add('light-mode');
            themeLabel.textContent = "Modo Claro";
            localStorage.setItem('theme', 'light');
        } else {
            document.body.classList.remove('light-mode');
            themeLabel.textContent = "Modo Oscuro";
            localStorage.setItem('theme', 'dark');
        }
    });

    // LÓGICA DE API KEY
    const apiKeyInput = document.getElementById('api-key-input');
    const saveKeyBtn = document.getElementById('save-key-btn');

    if (API_KEY) {
        apiKeyInput.value = API_KEY;
    }

    saveKeyBtn.addEventListener('click', () => {
        const newKey = apiKeyInput.value.trim();
        if (newKey) {
            localStorage.setItem('gemini_api_key', newKey);
            API_KEY = newKey;
            alert('¡Llave de API guardada correctamente!');
        } else {
            alert('Por favor, ingresa una llave válida.');
        }
    });

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = userInput.value.trim();

        if (text) {
            addMessage(text, 'student');
            userInput.value = '';

            // Mostrar estado de "pensando"
            const typingDiv = document.createElement('div');
            typingDiv.classList.add('message', 'mentor', 'typing');
            typingDiv.textContent = "...";
            messagesContainer.appendChild(typingDiv);

            const response = await callGeminiAPI(text);

            messagesContainer.removeChild(typingDiv);
            addMessage(response, 'mentor');
        }
    });
});
