import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
// import { webSocket, WebSocketSubject } from 'rxjs/webSocket';

@Injectable({
  providedIn: 'root', 
})
export class Table3Service {
  private socket!: WebSocket; // WebSocket object for establishing a connection
  private subject!: Subject<MessageEvent>|null; // Subject for handling incoming messages

  constructor() {
    this.subject = null; // Initialize subject as null
  }

  // Function to connect to WebSocket server
  public connect(url:URL): Subject<MessageEvent> {
    console.log('Connecting to WebSocket...');
    if (!this.subject) { // Check if subject is null
      this.socket = new WebSocket(url); // Create a new WebSocket object
      this.subject = new Subject<MessageEvent>(); // Create a new Subject for handling messages
      this.socket.onmessage = event => { // Event listener for incoming messages
        if (this.subject) {
          this.subject.next(event); // Pass the incoming message to the subject
        }
      };
      this.socket.onerror = event => { // Event listener for WebSocket errors
        if (this.subject) {
          this.subject.error(event); // Pass the error event to the subject
        }
      };
      this.socket.onclose = () => { // Event listener for WebSocket close
        if (this.subject) {
          this.subject.complete(); // Complete the subject
          this.disconnect(); // Disconnect from the WebSocket server
        }
      };
    }
    console.log('Connected to WebSocket');
    return this.subject; // Return the subject
  }

  // Function to disconnect from WebSocket server
  public disconnect(): void {
    if (this.socket) {
      this.socket.close(); // Close the WebSocket connection
    }
    if (this.subject) {
      this.subject.complete(); // Complete the subject
      this.subject = null; // Set subject to null
    }
  }

  // Example send function
  public sendMessage(message: any): void {
    if (this.socket) {
      this.socket.send(JSON.stringify(message)); // Send a message to the WebSocket server
    }
  }
}