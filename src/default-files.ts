import { FileContent } from "repograph-browser";

const files: FileContent[] = [
  {
    path: "src/main.ts",
    content: `import { formatMessage } from './utils/formatter';
import { createButton } from './ui/button';
import { Greeter } from './services/greeter.py';

console.log('App starting...');

const message = formatMessage('World');
const button = createButton('Click Me');
const greeter = new Greeter();

document.body.innerHTML = \`<h1>\${message}</h1>\`;
document.body.appendChild(button);
console.log(greeter.greet());
`
  },
  {
    path: "src/utils/formatter.ts",
    content: `/**
 * Formats a message with a greeting.
 * @param name The name to include in the message.
 * @returns The formatted message.
 */
export const formatMessage = (name: string): string => {
  return \`Hello, \${name}!\`;
};
`
  },
  {
    path: "src/ui/button.ts",
    content: `import { formatMessage } from '../utils/formatter';

export function createButton(text: string) {
  const btn = document.createElement('button');
  btn.textContent = text;
  // This is a contrived call to create a graph edge
  btn.ariaLabel = formatMessage('Button');
  return btn;
}
`
  },
  {
    path: "src/styles.css",
    content: `body {
  font-family: sans-serif;
  background-color: #f0f0f0;
}

h1 {
  color: #333;
}`
  },
  {
    path: 'src/services/greeter.py',
    content: `class Greeter:
    def __init__(self):
        self.message = "Hello from Python"

    def greet(self):
        return self.message
`
  },
  {
    path: 'src/data/user.java',
    content: `package com.example.data;

public class User {
    private String name;

    public User(String name) {
        this.name = name;
    }

    public String getName() {
        return name;
    }
}
`
  }
];

export const defaultFilesJSON = JSON.stringify(files, null, 2);