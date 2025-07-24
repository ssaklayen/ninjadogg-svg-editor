// Defines the interface for all command objects.

// PATTERN: Command (Interface) - The contract that all concrete command classes must follow.
export interface ICommand {
    execute(): void | Promise<void>;
}