// /src/services/socket.registry.ts

export class SocketRegistry {
  private static operators = new Map<string, string>()
  private static visitors = new Map<string, string>()

  static setOperator(operatorId: string, socketId: string) {
    this.operators.set(operatorId, socketId)
  }

  static getOperatorSocket(operatorId: string) {
    return this.operators.get(operatorId)
  }

  static removeOperator(operatorId: string) {
    this.operators.delete(operatorId)
  }

  static setVisitor(visitorId: string, socketId: string) {
    this.visitors.set(visitorId, socketId)
  }

  static getVisitorSocket(visitorId: string) {
    return this.visitors.get(visitorId)
  }
}
