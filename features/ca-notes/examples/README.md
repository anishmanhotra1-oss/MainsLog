# The Ink Lab — Few-Shot Training Examples

This directory contains few-shot demonstration examples used by the **Google Gemini Vision Pipeline** to teach the model how to accurately extract marked content without hallucinating unmarked text.

## How Few-Shot In-Context Learning Works

When `/api/ca-extract` processes a magazine page, it optionally prepends few-shot turns to the Gemini API request:
1. **Multi-color highlights**: Demonstrates distinguishing yellow (general facts), green (judgements/acts), and pink (reports/data).
2. **Underlines + handwritten margin notes**: Shows how margin handwriting connects to adjacent printed clauses via `note_attached_to`.
3. **Annotated maps & diagrams**: Teaches normalized `box_2d: [ymin, xmin, ymax, xmax]` coordinate extraction and descriptive captioning.
4. **Unmarked pages**: Explicitly trains the model to return empty arrays (`articles: []`, `visual_assets: []`) when a page contains printed text with zero annotations.

## Adding Your Own Sample Pages

To tune extraction accuracy for your specific handwriting style or pen colors:
1. Add an entry into `examples.json` following the schema:
   ```json
   {
     "description": "Your custom handwriting or marker style",
     "user_prompt": "Analyze Page X...",
     "model_response": {
       "page_number": X,
       "articles": [ ... ],
       "visual_assets": [ ... ],
       "takeaway": "..."
     }
   }
   ```
2. You can also place sample crop images in this folder (`example_page1.jpg`, `example_page2.jpg`).
3. The backend route `/api/ca-extract.js` automatically loads and applies these turns.
