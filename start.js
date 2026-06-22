const { spawn } = require('child_process');
const http = require('http');
const net = require('net');

console.log('🚀 Iniciando Snippet Palace...\n');

// Função para verificar se a porta está aberta
function checkPort(port, timeout = 2000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    socket.setTimeout(timeout);

    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, 'localhost');
  });
}

// Função para verificar se o servidor está rodando
function checkServer(url, timeout = 2000) {
  return new Promise((resolve) => {
    const request = http.get(url, (res) => {
      resolve(res.statusCode === 200);
    });

    request.on('error', (err) => {
      resolve(false);
    });
    request.setTimeout(timeout, () => {
      request.destroy();
      resolve(false);
    });
  });
}

// Função para aguardar o servidor
async function waitForServer(port, maxAttempts = 60) {
  console.log(`🔍 Verificando se a porta ${port} está aberta...`);

  for (let i = 0; i < maxAttempts; i++) {
    const portOpen = await checkPort(port);
    if (portOpen) {
      console.log(`✅ Porta ${port} está aberta!`);
      // Aguarda mais um pouco para garantir que o servidor está totalmente pronto
      await new Promise(resolve => setTimeout(resolve, 1000));
      return true;
    }
    if ((i + 1) % 10 === 0 || i < 3) {
      console.log(`⏳ Aguardando porta ${port}... (${i + 1}/${maxAttempts})`);
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return false;
}

async function start() {
  // Iniciar React
  console.log('📦 Iniciando React Dev Server...');
  const vite = spawn('node', ['node_modules/vite/bin/vite.js'], {
    stdio: 'inherit',
    shell: true
  });

  // Aguardar React inicializar
  console.log('⏳ Aguardando React inicializar...');
  await new Promise(resolve => setTimeout(resolve, 3000)); // Espera inicial de 3 segundos
  const reactReady = await waitForServer(3000);

  if (!reactReady) {
    console.error('❌ React não iniciou a tempo');
    console.error('💡 Tente verificar se há algo bloqueando a porta 3000');
    vite.kill();
    process.exit(1);
  }

  console.log('✅ React pronto! Compilando Electron...');
  await new Promise((resolve, reject) => {
    const tsc = spawn('node', ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.electron.json'], {
      stdio: 'inherit',
      shell: true
    });
    tsc.on('close', code => code === 0 ? resolve() : reject(new Error(`tsc exited with code ${code}`)));
  });
  console.log('✅ Electron compilado! Iniciando Electron...');

  // Iniciar Electron
  const electron = spawn('node', ['node_modules/electron/cli.js', '.'], {
    stdio: 'inherit',
    shell: true
  });

  // Cleanup
  process.on('SIGINT', () => {
    console.log('\n🛑 Parando aplicação...');
    vite.kill();
    electron.kill();
    process.exit();
  });
}

start().catch(console.error);