// @ts-check
// @ts-ignore
const { WebpackModules, FluxDispatcher } = VApi;

const MessageActions = WebpackModules.findByProps("sendMessage");
const BotMessageActions = WebpackModules.findByProps("sendBotMessage");

class MutatableObject extends Object {
    constructor(items) {
        super();
        if (items) {
            this.extend(items);
        }
    }

    /**
     * @name push
     * @description Key/Value to push to the object.
     * @param {any} key
     * @param {any} value
     */
    push(key, value) {
        this[key] = value;
    }

    /**
     * @name extend
     * @description Extend the object with another object.
     * @param {object} extenders - Object of key/value pairs to extend the object with.
     */
    extend(...extenders) {
        for (let i = 0; i < extenders.length; i++) {
            for (const key in extenders[i]) {
                if (extenders[i].hasOwnProperty(key)) {
                    if (typeof this[key] === "object" && typeof extenders[i][key] === "object") {
                        this.extend(this[key], extenders[i][key]);
                    } else if (typeof extenders[i][key] === "object") {
                        this[key] = {};
                        this.extend(this[key], extenders[i][key]);
                    } else if (extenders[i][key]) {
                        this[key] = extenders[i][key];
                    }
                }
            }
        }
        return this;
    }
}

const Aqua = new (class {
    constructor(ALLOW_LIST, BLOCK_LIST, SAFE_LIST, GUILD_BLACKLIST) {
        this.ALLOW_LIST = new MutatableObject(ALLOW_LIST) || new MutatableObject();
        this.BLOCK_LIST = new MutatableObject(BLOCK_LIST) || new MutatableObject();
        this.SAFE_LIST = new MutatableObject(SAFE_LIST) || new MutatableObject();
        this.GUILD_BLACKLIST = new MutatableObject(GUILD_BLACKLIST) || new MutatableObject();
    }

    /**
     * @param {string | number} guildId
     * @returns {boolean}
     */
    isBlacklisted(guildId) {
        return this.GUILD_BLACKLIST[guildId];
    }
    /**
     * @param {string | number} userId
     * @returns {boolean}
     */
    isBlocked(userId) {
        return this.BLOCK_LIST[userId];
    }
    /**
     * @param {string | number} userId
     * @returns {boolean}
     */
    isSafe(userId) {
        return this.SAFE_LIST[userId];
    }
    /**
     * @param {string | number} userId
     * @returns {boolean}
     */
    isAllowed(userId) {
        return this.ALLOW_LIST[userId];
    }

    CommandGroup = class CommandGroup {
        /**
         * @name CommandGroup
         * @description Creates a group of commands.
         * @param {string} [prefix] - The prefix to use for this command group.
         */
        constructor(prefix) {
            this.prefix = prefix || "--";
            this.COMMANDS = {};
        }

        /**
         * @name updatePrefix
         * @description Updates the prefix for this command group.
         * @param {string} prefix - The new prefix to use for this command group.
         */
        updatePrefix(prefix) {
            this.prefix = prefix;
        }

        /**
         * @name registerCommand
         * @description Registers a command to this command group.
         * @param {string} name - The name of the command.
         * @param {function} callback - The callback to run when the command is called.
         * @param {object} [options] - The options for the command.
         */
        registerCommand(name, callback, options = {}) {
            if (this.COMMANDS[name]) {
                throw new Error(`Command ${name} already exists.`);
            }

            this.COMMANDS[name] = {
                name,
                callback,
                options,
            };

            Aqua.on("messageCreate", (context) => {
                if (!Aqua.isAllowed(context.message.author.id)) return;
                if (options.safe && !Aqua.isSafe(context.message.author.id)) return;
                if (Aqua.isBlocked(context.message.author.id)) return;

                let timeout;
                if (context.message.content.indexOf(`${this.prefix}${name}`) == 0 && context.message.content && context.message.guild_id) {
                    if (Aqua.isBlacklisted(context.message.guild_id)) return;

                    if (timeout) return;

                    timeout = setTimeout(() => {
                        timeout = null;
                    }, 1000);

                    callback(context);
                }
            });
        }
    };

    /**
     * @name on
     * @description Binds a listener to a specific event in discord.
     * @param {"messageCreate"|"messageUpdate"|"messageDelete"|"loadMessages"|"userUpdate"|"currentUserUpdate"} event - The event to listen for.
     * @param {function} callback - The callback to call when the event is fired.
     */
    on(event, callback) {
        switch (event) {
            case "messageCreate":
                FluxDispatcher.subscribe("MESSAGE_CREATE", callback);
                break;
            case "messageUpdate":
                FluxDispatcher.subscribe("MESSAGE_UPDATE", callback);
                break;
            case "messageDelete":
                FluxDispatcher.subscribe("MESSAGE_DELETE", callback);
                break;
            case "loadMessages":
                FluxDispatcher.subscribe("LOAD_MESSAGES", callback);
                break;
            case "userUpdate":
                FluxDispatcher.subscribe("USER_UPDATE", callback);
                break;
            case "currentUserUpdate":
                FluxDispatcher.subscribe("CURRENT_USER_UPDATE", callback);
                break;
            default:
                throw new Error(`attempted to add unknown listener "${event}"`);
        }
    }
    /**
     * @name sendBotMessage
     * @description Sends a message to a channel as Clyde.
     * @param {string} channelId - The channel to send the message to.
     * @param {string} message - The message to send.
     * @param {array} [attachments] - The attachments to send.
     * @returns <Promise> - A promise that resolves when the message is sent.
     */
    sendBotMessage(channelId, message, attachments) {
        return BotMessageActions.sendBotMessage(channelId, message, attachments);
    }
    /**
     * @name sendMessage
     * @description Sends a message to a channel.
     * @param {string} channelId - The channel to send the message to.
     * @param {string} content - The message to send.
     * @returns <Promise> - A promise that resolves when the message is sent.
     * @deprecated This function is unsafe in mass quantities and may get you banned from discord.
     */
    sendMessage(channelId, content) {
        setTimeout(() => {
            return MessageActions.sendMessage(
                channelId,
                {
                    content: content,
                    tts: false,
                    invalidEmojis: [],
                    validNonShortcutEmojis: [],
                },
                undefined,
                {},
            );
        }, 1000);
    }
})();

module.exports = Aqua;
