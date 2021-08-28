# WebGL Lighting and Shading
![Screenshot of WebGL scene](https://raw.githubusercontent.com/spencerfitch/webgl-lighting/main/images/sample_scene.PNG)

This project demonstrates multiple different lighting and shading systems within an interactive 3D WebGL canvas. The project is accessible in full through the [GitHub Pages webpage](https://spencerfitch.github.io/webgl-lighting/) associated with this repository. The page is designed to be viewed on desktop, ideally in a large window or full screen.

The project was originally created as part of an Introduction to Computer Graphics course that I took in Fall 2020 but has since been updated with much cleaner code and comments. The full report that was created to go along with this project can be read in this repository through the [report.pdf](https://spencerfitch.github.io/webgl-lighting/report.pdf) file.

## Technical Details
In all, this project relies on the following programming languages and technologies:
* WebGL
* JavaScript
* HTML
* CSS

This project utilizes a library of WebGL tools that was provided to us as part of the course for completion of the project. This library, contained in the [lib](https://github.com/spencerfitch/webgl-lighting/tree/main/scripts/lib) directory, provides the interface for allocating the custom WebGL shading, lighting, and objects onto the GPU for improved performance.

The actual code that creates the scene, such as the WebGL shader and vertex elements, were all created custom for this project and can be seen in the [VBObox_lib.js](https://github.com/spencerfitch/webgl-lighting/blob/main/scripts/VBObox_lib.js) file. This file contains 3 different Vertex Buffer Objects that each contain the necessary WebGL shading and lighting code as well as the vertex values and information necessary to completely represent and render a given scene. These VBObox objects are then referenced in the [index.js](https://github.com/spencerfitch/webgl-lighting/blob/main/scripts/index.js) file in order to render these Vertex Buffer Objects interactively in the HTML5 WebGL canvas.

The user interface and interaction are handled using standard vanilla JavaScript coupled with custom CSS styling for a more pleasant appearance.
