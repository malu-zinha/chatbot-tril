import { ProjetoModel } from '../models/projeto';
import { ObraModel } from '../models/obra';
import { AreaModel } from '../models/area';

export class ProjetoService {
  static async criarProjeto(obraId: string, areaNome: string) {
    // Verificar se a obra existe
    const obra = await ObraModel.buscarPorId(obraId);
    if (!obra) {
      throw new Error('Obra não encontrada');
    }

    // Buscar ou criar área
    let area = await AreaModel.buscarPorNome(areaNome);
    if (!area) {
      area = await AreaModel.criar({ nome: areaNome });
    }

    // Verificar se já existe projeto para essa obra/área
    const projetoExistente = await ProjetoModel.buscarPorObraEArea(obraId, area.id);
    if (projetoExistente) {
      return projetoExistente;
    }

    // Criar novo projeto
    return await ProjetoModel.criar({
      obraId,
      areaId: area.id,
    });
  }

  static async buscarProjeto(obraId: string, areaNome: string) {
    const area = await AreaModel.buscarPorNome(areaNome);
    if (!area) {
      return null;
    }

    return await ProjetoModel.buscarPorObraEArea(obraId, area.id);
  }

  static async atualizarDados(projetoId: string, dados: string, usuarioId: string, nomeUsuario: string) {
    const projeto = await ProjetoModel.atualizar(projetoId, { dados });
    
    // Registrar acesso
    await ProjetoModel.registrarAcesso(projetoId, usuarioId, nomeUsuario, 'ATUALIZOU');
    
    return projeto;
  }

  static async visualizarProjeto(projetoId: string, usuarioId: string, nomeUsuario: string) {
    const projeto = await ProjetoModel.buscarPorId(projetoId);
    
    if (projeto) {
      // Registrar acesso
      await ProjetoModel.registrarAcesso(projetoId, usuarioId, nomeUsuario, 'VISUALIZOU');
    }
    
    return projeto;
  }

  static async listarProjetosPorObra(obraId: string) {
    return await ProjetoModel.listarPorObra(obraId);
  }
}

