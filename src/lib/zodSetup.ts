import { z } from 'zod';

// O Zod testa se o navegador aceita `Function()` para compilar validadores. A política de segurança (CSP) proíbe eval,
// então desligamos esse atalho: a validação é a mesma, só sem código gerado em tempo de execução.
// Todo arquivo que cria esquemas importa `z` DAQUI (não de 'zod'), para a configuração valer antes de qualquer esquema existir.
z.config({ jitless: true });

export { z };
