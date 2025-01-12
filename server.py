from http.server import HTTPServer, SimpleHTTPRequestHandler
import os
import json
from urllib.parse import parse_qs
import logging
from email.parser import BytesParser
from io import BytesIO
import base64
from datetime import datetime

# Configure logging
logging.basicConfig(
    filename='errors.log',
    level=logging.ERROR,
    format='%(asctime)s - %(levelname)s\n=== Server Info ===\nPath: %(path)s\nClient: %(client)s\nHeaders: %(headers)s\n=== Error Details ===\n%(message)s\n' + '='*50 + '\n'
)

class CORSRequestHandler(SimpleHTTPRequestHandler):
    def _write_to_error_log(self, error_text):
        try:
            extra = {
                'path': self.path,
                'client': self.client_address[0],
                'headers': dict(self.headers)
            }
            logging.error(error_text, extra=extra)
            print("[ERROR LOG]", error_text.split('\n')[0])  # Print first line to console
        except Exception as e:
            print(f"Error writing to log file: {e}")
    def end_headers(self):
        # Enable CORS
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        # Handle preflight requests
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        if self.path == '/api/upload-image':
            try:
                content_type = self.headers.get('Content-Type', '')
                if not content_type.startswith('multipart/form-data'):
                    raise ValueError('Expected multipart/form-data')
                
                # Parse the boundary from Content-Type
                boundary = content_type.split('=')[1].encode()
                
                # Read the entire request body
                content_length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(content_length)
                
                # Create a BytesParser
                parser = BytesParser()
                
                # Prepare the message for parsing
                message = parser.parsebytes(
                    b'Content-Type: ' + content_type.encode() + b'\r\n\r\n' + body
                )
                
                # Extract form data
                form_data = {}
                for part in message.get_payload():
                    # Get the field name from Content-Disposition
                    content_disp = part.get('Content-Disposition', '')
                    if not content_disp:
                        continue
                    
                    # Parse the name field
                    import re
                    name_match = re.search(r'name="([^"]*)"', content_disp)
                    if not name_match:
                        continue
                    
                    field_name = name_match.group(1)
                    form_data[field_name] = part.get_payload()
                
                if 'image' not in form_data or 'path' not in form_data:
                    self.send_response(400)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        'status': 'error',
                        'message': 'Missing image or path'
                    }).encode())
                    return

                image_data = form_data['image']
                save_path = form_data['path']
                
                # Ensure the directory exists
                os.makedirs(os.path.dirname(save_path), exist_ok=True)
                
                # Save the image
                if isinstance(image_data, str) and image_data.startswith('data:image'):
                    # Handle base64 encoded image
                    header, encoded = image_data.split(",", 1)
                    image_data = base64.b64decode(encoded)
                
                with open(save_path, 'wb') as f:
                    f.write(image_data)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'status': 'success',
                    'path': save_path
                }).encode())
                
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'status': 'error',
                    'message': str(e)
                }).encode())
                
        elif self.path == '/api/log-error':
            try:
                # Parse the multipart form data
                content_type = self.headers.get('Content-Type', '')
                if not content_type.startswith('multipart/form-data'):
                    raise ValueError('Expected multipart/form-data')
                
                # Parse the boundary from Content-Type
                boundary = content_type.split('=')[1].encode()
                
                # Read the entire request body
                content_length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(content_length)
                
                # Create a BytesParser
                parser = BytesParser()
                
                # Prepare the message for parsing
                message = parser.parsebytes(
                    b'Content-Type: ' + content_type.encode() + b'\r\n\r\n' + body
                )
                
                # Extract form data
                form_data = {}
                for part in message.get_payload():
                    # Get the field name from Content-Disposition
                    content_disp = part.get('Content-Disposition', '')
                    if not content_disp:
                        continue
                    
                    # Parse the name field
                    name_match = re.search(r'name="([^"]*)"', content_disp)
                    if not name_match:
                        continue
                    
                    field_name = name_match.group(1)
                    form_data[field_name] = part.get_payload()

                # Get the error log text
                if 'errorLog' in form_data:
                    error_text = form_data['errorLog']
                    self._write_to_error_log(error_text)
                    
                    # Send success response
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({'status': 'success'}).encode())
                else:
                    # Send error response if no error log provided
                    self.send_response(400)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        'status': 'error',
                        'message': 'No error log provided'
                    }).encode())
            except Exception as e:
                # Send error response if something goes wrong
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'status': 'error',
                    'message': str(e)
                }).encode())
        else:
            # Handle other POST requests
            self.send_response(404)
            self.end_headers()

def run_server(port=8000):
    server_address = ('', port)
    httpd = HTTPServer(server_address, CORSRequestHandler)
    print(f"=== Debug Server Running ===")
    print(f"URL: http://localhost:{port}")
    print(f"Time: {datetime.now().isoformat()}")
    print(f"Mode: Verbose Logging Enabled")
    print("="*30)
    httpd.serve_forever()

if __name__ == '__main__':
    run_server()
