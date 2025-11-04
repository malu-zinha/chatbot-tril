// Exemplo de rotas para API REST (futura integração)
// Pode usar Express.js ou Fastify

import { ProjetoService } from '../services/projetoService';

export class ProjetoRoutes {
  // GET /projetos/:obraId
  static async listarProjetos(obraId: string) {
    try {
      const projetos = await ProjetoService.listarProjetosPorObra(obraId);
      return { success: true, data: projetos };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // POST /projetos
  static async criarProjeto(obraId: string, areaNome: string) {
    try {
      const projeto = await ProjetoService.criarProjeto(obraId, areaNome);
      return { success: true, data: projeto };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // PUT /projetos/:id
  static async atualizarProjeto(
    projetoId: string,
    dados: string,
    usuarioId: string,
    nomeUsuario: string
  ) {
    try {
      const projeto = await ProjetoService.atualizarDados(
        projetoId,
        dados,
        usuarioId,
        nomeUsuario
      );
      return { success: true, data: projeto };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

