library(shiny)

# 1. MOCK DATA
set.seed(42)
especies <- sample(c("Sparus aurata", "Dicentrarchus labrax", "Scophthalmus maximus"), 100, replace = TRUE, prob = c(0.4, 0.35, 0.25))
contagem_especies <- table(especies)

abundancia_nomes <- c("Vibrio", "Photobacterium", "Pseudomonas", "Flavobacterium", "Tenacibaculum", "Aeromonas", "Aliivibrio")
abundancia_valores <- c(25.4, 18.2, 15.1, 12.3, 10.5, 8.4, 5.2)

# 2. INTERFACE (UI)
ui <- fluidPage(
  tags$head(
    tags$style(HTML("
      html, body, .container-fluid, #root {
        background-color: #09122C !important;
        overflow: hidden !important;
        color: #cbd5e1;
        font-family: 'Inter', sans-serif;
        margin: 0;
        padding: 0;
        min-height: 100vh;
      }
      .chart-container {
        display: flex;
        flex-wrap: wrap;
        gap: 20px;
        justify-content: space-around;
        padding: 10px;
      }
      .plot-box {
        background-color: rgba(9, 18, 44, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 2rem;
        padding: 20px;
        width: 48%;
        min-width: 300px;
      }
      h4 {
        color: white;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        font-size: 14px;
        font-weight: bold;
        margin-bottom: 20px;
        text-align: center;
      }
    "))
  ),
  
  div(class = "chart-container",
      div(class = "plot-box",
          h4("Species Distribution (Shiny)"),
          plotOutput("pieChart", height = "300px")
      ),
      div(class = "plot-box",
          h4("Relative Abundance (Shiny)"),
          plotOutput("barChart", height = "300px")
      )
  )
)

# 3. LÓGICA (SERVER)
server <- function(input, output, session) {
  
  # Gráfico 1: Pie Chart (Base R)
  output$pieChart <- renderPlot({
    par(bg = "transparent", mar = c(1,1,1,1))
    cores <- c("#10b981", "#3b82f6", "#06b6d4")
    
    pie(contagem_especies, 
        labels = paste0(names(contagem_especies), "\n", contagem_especies, "%"), 
        col = cores, 
        border = "#FFFFFF1A",
        col.main = "white",
        cex = 1.1)
  }, bg = "transparent")
  
  # Gráfico 2: Bar Chart (Base R)
  output$barChart <- renderPlot({
    par(bg = "transparent", mar = c(6, 4, 1, 1), col.axis = "#64748b", col.lab = "#64748b")
    
    bp <- barplot(abundancia_valores, 
            names.arg = abundancia_nomes, 
            col = "#10B981B2", 
            border = "#10b981",
            las = 2, # Roda as letras
            ylab = "Relative Abundance (%)")
            
  }, bg = "transparent")
}

# 4. EXECUTAR A APP
shinyApp(ui = ui, server = server)
