import { ObraModel, ObraData } from '../models/obra.ts';
import { ClienteModel } from '../models/cliente.ts';

export class ObraService {
  static async criarObra(data: ObraData) {
    // Verificar se o cliente existe
    const cliente = await ClienteModel.buscarPorId(data.clienteId);
    if (!cliente) {
      throw new Error('Cliente não encontrado');
    }

    return await ObraModel.criar(data);
  }

  static async buscarObraPorId(id: string) {
    const obra = await ObraModel.buscarPorId(id);
    if (!obra) {
      throw new Error('Obra não encontrada');
    }
    return obra;
  }

  static async listarObrasDoCliente(clienteId: string) {
    return await ObraModel.listarPorCliente(clienteId);
  }

  static async atualizarStatus(id: string, status: string) {
    return await ObraModel.atualizar(id, { status });
  }

  static async concluirObra(id: string) {
    return await ObraModel.atualizar(id, {
      status: 'CONCLUIDA',
      dataTermino: new Date(),
    });
  }
}

