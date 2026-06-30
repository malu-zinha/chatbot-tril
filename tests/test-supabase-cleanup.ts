import SupabaseService from '../integrations/supabase/supabaseService.ts';

let pass = 0;
let fail = 0;

function assert(cond: boolean, name: string) {
  if (cond) {
    pass++;
    console.log(`OK ${name}`);
  } else {
    fail++;
    console.error(`FAIL ${name}`);
  }
}

const service = Object.create(SupabaseService.prototype) as SupabaseService;
let rpcName = '';
let rpcArgs: any = null;

(service as any).connected = true;
(service as any).supabase = {
  async rpc(name: string, args: any) {
    rpcName = name;
    rpcArgs = args;
    return {
      data: {
        dry_run: true,
        projetos_candidatos: 2,
        projetos_excluidos: 0,
      },
      error: null,
    };
  },
};

const result = await (service as any).limparProjetosFinalizadosAntigos(6, true);

assert(rpcName === 'limpar_projetos_finalizados_antigos', 'chama a RPC de limpeza semestral');
assert(rpcArgs.p_meses === 6, 'envia quantidade de meses');
assert(rpcArgs.p_dry_run === true, 'envia dry-run quando solicitado');
assert(result.projetos_candidatos === 2, 'retorna dados da RPC');

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
