"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const morgan_1 = __importDefault(require("morgan"));
/**------------------------ */
const index_1 = __importDefault(require("./routes/index"));
const players_1 = __importDefault(require("./routes/players"));
const friendRequest_1 = __importDefault(require("./routes/friendRequest"));
const pvpRouter_1 = __importDefault(require("./routes/pvpRouter"));
const teamRouter_1 = __importDefault(require("./routes/teamRouter"));
const rumbleRouter_1 = __importDefault(require("./routes/rumbleRouter"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const tokenRefreshRouter_1 = __importDefault(require("./routes/tokenRefreshRouter"));
const devTester_1 = __importDefault(require("./routes/devTester"));
const database_1 = __importDefault(require("./config/database"));
// Initialize database
(0, database_1.default)();
const app = (0, express_1.default)();
//Middleware Setup
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: false }));
app.use((0, morgan_1.default)('dev'));
// Route setup
app.use('/', index_1.default);
app.use('/api', tokenRefreshRouter_1.default);
app.use('/api/friendRequests', friendRequest_1.default);
app.use(players_1.default);
app.use(pvpRouter_1.default);
app.use(teamRouter_1.default);
app.use(rumbleRouter_1.default);
app.use(notifications_1.default);
app.use('/api', devTester_1.default);
exports.default = app;
