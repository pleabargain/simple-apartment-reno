you are an expert in apartment renovation
use the HTML tools that you are most comfortable with
do not consider CSS in the HTML

use a python server to serve the html files

To open HTML files in Windows PowerShell:
Use the command: Invoke-Item index.html
(This will open the file in the default browser)

when user tries to open a page, use the MIME type to determine the file type and show those files

Error Handling Requirements:

IMPORTANT: Error Logging
- All errors MUST be logged to 'errors.log' in the root directory
- The errors.log file will be automatically created if it doesn't exist
- Each error entry in errors.log will include:
  * Timestamp in ISO format
  * Operation being performed when error occurred
  * Full error message and stack trace
  * Context data related to the error
- Errors are automatically appended to errors.log to maintain a complete history
- Add a prominent "View Console Errors" button at the top of each HTML page
- Implement verbose JavaScript error handling for all operations:
  * JSON file loading and parsing
  * Image file handling
  * Data saving operations
  * Form submissions
  * API calls to Ollama
* model = 'llama3.2';

- Log all errors with:
  * Timestamp
  * Operation being attempted
  * Full error message and stack trace
  * User inputs or file contents that caused the error
- Display user-friendly error messages in the UI
- Create error.log file in the root directory
- append the errors to the error.log file with a date stamp
- Implement proper CORS handling for local JSON file access
- Add try/catch blocks around all async operations
- Add input validation with detailed error messages
- Add data type checking and sanitization

extract all java script functions to the same directory
call the java script functions as necessary
do not store the java script functions in the html files

Version Control Requirements:

JavaScript Files:
- Each JavaScript file MUST include a version header at the top:
```javascript
/**
 * Module Name
 * Version: X.Y.Z (Major.Minor.Patch)
 * Last Updated: YYYY-MM-DD
 * 
 * Changes:
 * - X.Y.Z: Description of latest changes
 * - X.Y.Z: Description of previous changes
 * - X.Y.Z: Description of older changes
 */
```
- Version numbers follow semantic versioning:
  * Major (X): Breaking changes
  * Minor (Y): New features, backwards compatible
  * Patch (Z): Bug fixes, backwards compatible
- Every edit MUST:
  * Increment the appropriate version number
  * Update the Last Updated date
  * Add a description of changes to the Changes section
  * List changes from newest to oldest

HTML Files:
- Each HTML file MUST include a version comment in the head:
```html
<!--
  Page Name
  Version: X.Y.Z
  Last Updated: YYYY-MM-DD
  
  Changes:
  - X.Y.Z: Description of latest changes
  - X.Y.Z: Description of previous changes
  - X.Y.Z: Description of older changes
-->
```
- Follow the same semantic versioning rules as JavaScript files
- Every edit MUST update version info and document changes


there might be multiple entries for countertops, dishwashers, sinks, faucets, ovens, ranges, refrigerators, microwaves
provide a way to add multiple entries
provide a way to delete an entry
provide a way to edit an entry
Provide a way to select entries

Provide a way to get a total cost for room and for total project
all costs are in AED
Provide entry for cost of designer
Provide entry for cost of demolition
Provide entry for cost of materials
Provide entry for cost of labor


provide a way to interact with the data in the JSON files so that Ollama3.2 can use it

JSON File Management:
- Create sample JSON files for each room
- Create a way to load the sample JSON files into the html files
- Create a way to load the sample JSON files into the html files
- Dated versions should follow format: MACHINE_MADE_{ROOM_NAME}_{YY.MM.DD.HH.SS}.json



Ollama3.2 Integration:
- Each room will have a chat interface to ask questions via Ollama3.2
- Make direct API calls to a locally running Ollama server
- Load JSON data into Ollama3.2 as part of the prompt for context
- Ollama3.2 will be able to answer questions about the room and its items
- save the input to a JSON file in the room's directory
- save the output to a JSON file in the room's directory
- create a JSON file for the chat history that appends new messages to existing chat history
- chat history files use timestamp format YY.MM.DD.HH.SS

create forms for the following items:

kitchen renovation
-countertop
-dishwasher
-sink
-faucet
-oven
-range
-refrigerator
-microwave

living room renovation
-painting
-lighting
-ceiling fan
-window treatments
-flooring
-furniture

master bathroom renovation
-lighting
-vanity
-storage

guest bathroom renovation
-lighting
-vanity
-storage

bedroom renovation
-painting
-lighting
-curtains


Item Fields:
- Each item will have a note field for additional information
- Each item will have a URL field that opens in a new tab when clicked
- Each item will have an image field to add an image
- Images will be stored as file paths in the JSON, pointing to files in the room's directory

Gallery Features:
- Each room will have a gallery section on the page showing all images
- Each image will have an option to delete
- Each image will have an option to add/edit caption
- All images will be stored in the room's directory

Data Storage:
- All data is stored in separate JSON files
- Each room has its own folder for organization
- Images are stored in the room's directory
