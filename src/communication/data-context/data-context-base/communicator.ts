export abstract class DataBaseCommunicator<TCommand> {
    public abstract executeCommand(command : TCommand) : void;
}