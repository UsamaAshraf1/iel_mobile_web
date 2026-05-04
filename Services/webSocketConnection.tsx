// services/StompService.ts
import { Client, IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface OrderNotifyMessage {
  // userId: string;
  // orderNo: string;
  // action: string;
  // message: string;
  // seqNo: string;
  // time: string;
  userId: string;
  orderNo: string | null;
  time: string;
  timeMobile: string;
  message: string;
  action: string;
  market: boolean;
  refNo: string;
  status: string;
  price: number | null;
  quantity: number | null;
  symbol: string | null;
  triggerPrice: number | null;
}

class StompService {
  private static instance: StompService;
  private client: Client | null = null;

  // CHANGE THIS TO YOUR REAL SERVER
  private url = "https://trade.iel.net.pk:1219/order-dispatch-websocket";

  private activeUserId = "";
  private connected = false;

  // -----------------------------------------------------------------
  // CALLBACKS
  // -----------------------------------------------------------------
  private onConnectCallbacks: (() => void)[] = [];
  private onErrorCallbacks: ((err: any) => void)[] = [];
  private onOrderNotifyCallbacks: ((msg: OrderNotifyMessage) => void)[] = [];

  private constructor() {}

  static getInstance(): StompService {
    if (!StompService.instance) {
      StompService.instance = new StompService();
    }
    return StompService.instance;
  }

  // -----------------------------------------------------------------
  // CONNECT (Login)
  // -----------------------------------------------------------------
  // connect(userId: string, password: string): Promise<void> {
  //   return new Promise((resolve, reject) => {
  //     const socket = new SockJS(this.url);

  //     this.client = new Client({
  //       webSocketFactory: () => socket,
  //       connectHeaders: {
  //         id: userId.toUpperCase(),
  //         nostr: password,
  //       },
  //       debug: (str) => console.log("%c[STOMP DEBUG]", "color: #888", str),

  //       // Reconnect on failure
  //       reconnectDelay: 3000,
  //       heartbeatIncoming: 4000,
  //       heartbeatOutgoing: 4000,

  //       // WebSocket lifecycle events
  //       onWebSocketOpen: (evt) => {
  //         console.log("%c[WS OPEN]", "color: #0b5; font-weight: bold", evt);
  //       },

  //       onWebSocketClose: (closeEvent) => {
  //         const { code, reason, wasClean } = closeEvent;
  //         const status = wasClean ? "CLEAN" : "ABNORMAL";
  //         console.warn(
  //           `%c[WS CLOSED] ${status} | Code: ${code} | Reason: ${
  //             reason || "none"
  //           }`,
  //           "color: #b00; font-weight: bold"
  //         );

  //         // Optional: Auto-reconnect logic
  //         if (!wasClean && code !== 1000) {
  //           console.log(
  //             "%c[STOMP] Attempting reconnect in 3s...",
  //             "color: #f90"
  //           );
  //         }
  //       },

  //       onWebSocketError: (error) => {
  //         console.error(
  //           "%c[WS ERROR]",
  //           "color: #b00; font-weight: bold",
  //           error
  //         );
  //       },

  //       // STOMP-level connection success
  //       onConnect: (frame) => {
  //         console.log(
  //           "%c[STOMP CONNECTED]",
  //           "color: #0b5; font-weight: bold",
  //           frame
  //         );
  //         this.connected = true;
  //         this.activeUserId = userId.toUpperCase();

  //         // Notify login
  //         this.send("/app/order-service/login-details", this.activeUserId);

  //         // Subscribe to notify
  //         this.subscribe(
  //           `/user/${this.activeUserId}/order-service.notify`,
  //           (msg) => {
  //             const payload = JSON.parse(msg.body);
  //             console.log(
  //               "%c[STOMP RECV] /order-service.notify",
  //               "color: #0b5",
  //               payload
  //             );
  //             this.onOrderNotifyCallbacks.forEach((cb) => cb(payload));
  //           }
  //         );

  //         this.onConnectCallbacks.forEach((cb) => cb());
  //         resolve();
  //       },

  //       // STOMP-level error (server-side or protocol)
  //       onStompError: (frame) => {
  //         console.error(
  //           "%c[STOMP ERROR]",
  //           "color: #b00; font-weight: bold",
  //           frame.headers["message"] || "Unknown STOMP error",
  //           frame.body ? JSON.parse(frame.body) : ""
  //         );
  //         this.onErrorCallbacks.forEach((cb) => cb(frame));
  //         reject(frame);
  //       },

  //       // Optional: Handle disconnect
  //       onDisconnect: () => {
  //         console.log("%c[STOMP DISCONNECTED]", "color: #f90");
  //         this.connected = false;
  //       },
  //     });

  //     this.client.onConnect = (frame) => {
  //       console.log("STOMP Connected:", frame);
  //       this.connected = true;
  //       this.activeUserId = userId.toUpperCase();

  //       // ---- 1. Notify login success (optional) ----
  //       this.send("/app/order-service/login-details", this.activeUserId);

  //       // ---- 2. SUBSCRIBE TO ORDER NOTIFY ----
  //       this.subscribe(
  //         `/user/${this.activeUserId}/order-service.notify`,
  //         (msg) => {
  //           const payload = JSON.parse(msg.body) as OrderNotifyMessage;
  //           this.onOrderNotifyCallbacks.forEach((cb) => cb(payload));
  //         }
  //       );

  //       // ---- 3. Also keep the generic error queue (optional) ----
  //       this.subscribe("/user/queue/errors", (msg) => {
  //         console.error("Server error:", msg.body);
  //       });

  //       this.onConnectCallbacks.forEach((cb) => cb());
  //       resolve();
  //     };

  //     this.client.onStompError = (frame) => {
  //       console.error("STOMP Error:", frame);
  //       this.onErrorCallbacks.forEach((cb) => cb(frame));
  //       reject(frame);
  //     };

  //     this.client.activate();
  //   });
  // }
  connect(userId: string, password: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.client?.connected) {
        resolve();
        return;
      }

      const socket = new SockJS(this.url);

      this.client = new Client({
        webSocketFactory: () => socket,
        connectHeaders: {
          id: userId.toUpperCase(),
          nostr: password,
        },
        debug: (str) => console.log("%c[STOMP DEBUG]", "color: #888", str),

        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,

        onWebSocketOpen: () =>
          console.log("%c[WS OPEN]", "color: #0b5; font-weight: bold"),
        onWebSocketClose: (e) =>
          console.warn(
            "%c[WS CLOSED]",
            "color: #b00",
            `code=${e.code} clean=${e.wasClean} reason=${e.reason}`
          ),
        onWebSocketError: (e) =>
          console.error("%c[WS ERROR]", "color: #b00", e),

        onConnect: (frame) => {
          console.log(
            "%c[STOMP CONNECTED]",
            "color: #0b5; font-weight: bold",
            frame
          );
          this.connected = true;
          this.activeUserId = userId.toUpperCase();

          // 1. Send login
          this.send("/app/order-service/login-details", this.activeUserId);

          // 2. Subscribe to personal notifications
          this.client?.subscribe(
            `/user/${this.activeUserId}/order-service.notify`,
            (msg) => {
              try {
                const payload = JSON.parse(msg.body) as OrderNotifyMessage;
                console.log(
                  "%c[ORDER NOTIFY]",
                  "color: #0b5; background: #000",
                  payload
                );
                AsyncStorage.setItem(
                  "order_notification",
                  JSON.stringify(payload)
                );
                this.onOrderNotifyCallbacks.forEach((cb) => cb(payload));
              } catch (err) {
                console.error("Invalid notify message:", msg.body, err);
              }
            }
          );

          // Optional: general error queue
          this.client?.subscribe("/user/queue/errors", (msg) => {
            console.error("Server error queue:", msg.body);
          });

          this.onConnectCallbacks.forEach((cb) => cb());
          resolve();
        },

        onStompError: (frame) => {
          console.error(
            "%c[STOMP ERROR]",
            "color: #b00; font-weight: bold",
            frame
          );
          this.onErrorCallbacks.forEach((cb) => cb(frame));
          reject(frame);
        },

        onDisconnect: () => {
          console.log("%c[STOMP DISCONNECTED]", "color: #f90");
          this.connected = false;
        },
      });

      this.client.activate();
    });
  }
  // -----------------------------------------------------------------
  // DISCONNECT
  // -----------------------------------------------------------------
  disconnect() {
    this.client?.deactivate();
    this.connected = false;
    this.activeUserId = "";
  }

  // -----------------------------------------------------------------
  // SEND NEW ORDER
  // -----------------------------------------------------------------
  placeNewOrder(orderData: any) {
    if (!this.connected) {
      console.warn("Cannot place order – STOMP not connected");
      return;
    }

    const payload = {
      ...orderData,
      clientCode: orderData.clientCode?.toUpperCase(),
      symbol: orderData.symbol?.toUpperCase(),
      userId: this.activeUserId,
      orignateSource: "W",
      loginId: "0:0:0:0:0:0:0:1_RMS01_1613472055433",
      discVolume: 0,
      // triggerPrice: orderData.tprice ?? 0,
      orderProperty: 111,
    };

    this.send(`/app/order-service.${this.activeUserId}`, payload);
  }

  // -----------------------------------------------------------------
  // GENERIC SEND
  // -----------------------------------------------------------------
  private send(destination: string, body: any) {
    if (!this.client?.connected) return;
    this.client.publish({
      destination,
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
  }

  // -----------------------------------------------------------------
  // GENERIC SUBSCRIBE (helper)
  // -----------------------------------------------------------------
  private subscribe(destination: string, callback: (msg: IMessage) => void) {
    if (!this.client?.connected) return;
    this.client.subscribe(destination, callback);
  }

  // -----------------------------------------------------------------
  // LISTENER REGISTRATION
  // -----------------------------------------------------------------
  onConnect(cb: () => void) {
    this.onConnectCallbacks.push(cb);
  }
  onError(cb: (err: any) => void) {
    this.onErrorCallbacks.push(cb);
  }

  /** Called every time the server pushes a notify message */
  onOrderNotify(cb: (msg: OrderNotifyMessage) => void) {
    this.onOrderNotifyCallbacks.push(cb);
  }

  // -----------------------------------------------------------------
  // GETTERS
  // -----------------------------------------------------------------
  get isConnected() {
    return this.connected;
  }
  get userId() {
    return this.activeUserId;
  }
}

export default StompService.getInstance();
