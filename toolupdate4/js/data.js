export const jsonData = {
  "page_1": [
    {
      "[y1, x1, y2, x2]": [84, 211, 155, 772],
      "code": "example_order = {\"order_id\": \"A12345\"}\nconvo = [HumanMessage(content=\"Please cancel my order A12345.\")]\nresult = graph.invoke({\"order\": example_order, \"messages\": convo})\nfor msg in result[\"messages\"]:\n    print(f\"{msg.type}: {msg.content}\")"
    },
    {
      "[y1, x1, y2, x2]": [168, 142, 314, 842],
      "text": "Great—you now have a working “cancel order” agent. Before we expand our agent,\nlet's reflect on why we started with such a simple slice. Scoping is always a balancing\nact. If you narrow your task too much—say, only cancellations—you miss out on\nother high-volume requests like refunds or address changes, limiting real-world\nimpact. But if you broaden it too far—“automate every support inquiry”—you'll\ndrown in edge cases like billing disputes, product recommendations, and technical\ntroubleshooting. And if you keep it vague—“improve customer satisfaction”—you'll\nnever know when you've succeeded."
    },
    {
      "[y1, x1, y2, x2]": [327, 142, 473, 842],
      "text": "Instead, by focusing on a clear, bounded workflow—canceling orders—we ensure\nconcrete inputs (customer message + order record), structured outputs (tool calls +\nconfirmations), and a tight feedback loop. For example, imagine an email that says,\n“Please cancel my order #B73973 because I found a cheaper option elsewhere.” A\nhuman agent would look up the order, verify it hasn't shipped, click “Cancel,” and\nreply with a confirmation. Translating this into code means invoking cancel_\norder(order_id=\"B73973\") and sending a simple confirmation message back to the\ncustomer."
    },
    {
      "[y1, x1, y2, x2]": [486, 142, 571, 842],
      "text": "Now that we have a working “cancel order” agent, the next question is: does it\nactually work? In production, we don't just want our agent to run—we want to know\nhow well it performs, what it gets right, and where it fails. For our cancel order agent,\nwe care about questions like:"
    },
    {
      "[y1, x1, y2, x2]": [587, 166, 646, 792],
      "list": [
        "Did it call the correct tool (cancel_order)?",
        "Did it pass the right parameters (the correct order ID)?",
        "Did it send a clear, correct confirmation message to the customer?"
      ]
    },
    {
      "[y1, x1, y2, x2]": [665, 142, 695, 842],
      "text": "In our open source repository, you'll find a full evaluation script to automate this\nprocess:"
    },
    {
      "[y1, x1, y2, x2]": [712, 166, 755, 360],
      "list": [
        "Evaluation dataset",
        "Batch evaluation script"
      ]
    },
    {
      "[y1, x1, y2, x2]": [773, 142, 804, 842],
      "text": "Here's a minimal, simplified version of this logic for how you might test your agent\ndirectly:"
    },
    {
      "[y1, x1, y2, x2]": [824, 169, 888, 688],
      "code": "# Minimal evaluation check\nexample_order = {\"order_id\": \"B73973\"}\nconvo = [HumanMessage(content='''Please cancel order #B73973.\n    I found a cheaper option elsewhere.''')]"
    },
    {
      "[y1, x1, y2, x2]": [923, 671, 936, 842],
      "text": "Our First Agent System | 19"
    }
  ],
  "page_2": [
    {
      "[y1, x1, y2, x2]": [84, 175, 203, 799],
      "code": "result = graph.invoke({\"order\": example_order, \"messages\": convo})\nassert any(\"cancel_order\" in str(m.content) for m in result[\"messages\"],\n           \"Cancel order tool not called\")\nassert any(\"cancelled\" in m.content.lower() for m in result[\"messages\"],\n           \"Confirmation message missing\")\n\nprint(\"✓ Agent passed minimal evaluation.\")"
    },
    {
      "[y1, x1, y2, x2]": [217, 142, 292, 842],
      "text": "This snippet ensures that the tool was called and the confirmation was sent. Of\ncourse, real evaluation goes deeper: you can measure tool precision, parameter accu-\nracy, and overall task success rates across hundreds of examples to catch edge cases\nbefore deploying. We’ll dive into evaluation strategies and frameworks in depth in\nChapter 9, but for now, remember: an untested agent is an untrusted agent."
    },
    {
      "[y1, x1, y2, x2]": [305, 142, 380, 842],
      "text": "Because both steps are automated using @tool decorators, writing tests against real\ntickets becomes trivial—and you instantly gain measurable metrics like tool recall,\nparameter accuracy, and confirmation quality. Now that we've built and evaluated a\nminimal agent, let's explore the core design decisions that will shape its capabilities\nand impact."
    },
    {
      "[y1, x1, y2, x2]": [426, 142, 451, 649],
      "text": "Core Components of Agent Systems"
    },
    {
      "[y1, x1, y2, x2]": [467, 142, 628, 842],
      "text": "Designing an effective agent-based system requires a deep understanding of the core\ncomponents that enable agents to perform their tasks successfully. Each component\nplays a critical role in shaping the agent's capabilities, efficiency, and adaptability.\nFrom selecting the right models to equipping the agent with tools, memory, and plan-\nning capabilities, these elements must work together to ensure that the agent can\noperate in dynamic and complex environments. This section delves into the key com-\nponents—the foundation model, tools, and memory—and explores how they interact\nto form a cohesive agent system. Figure 2-1 shows the core components of an agent\nsystem."
    },
    {
      "[y1, x1, y2, x2]": [648, 241, 829, 842],
      "image": null
    },
    {
      "[y1, x1, y2, x2]": [842, 142, 854, 532],
      "text": "Figure 2-1. Core components of an agent system."
    },
    {
      "[y1, x1, y2, x2]": [923, 142, 936, 427],
      "text": "20 | Chapter 2: Designing Agent Systems"
    }
  ],
  "page_3": [
    {
      "[y1, x1, y2, x2]": [84, 142, 108, 342],
      "text": "Model Selection"
    },
    {
      "[y1, x1, y2, x2]": [125, 142, 239, 842],
      "text": "At the heart of every agent-based system lies the model that drives the agent’s\ndecision-making, interaction, and learning capabilities. Selecting the right model is\nfoundational: it determines how the agent interprets inputs, generates outputs, and\nadapts to its environment. This decision influences the system’s performance, scala-\nbility, latency, and cost. Choosing an appropriate model depends on the complexity of\nthe agent’s tasks, the nature of the input data, infrastructure constraints, and the\ntrade-offs between generality, speed, and precision."
    },
    {
      "[y1, x1, y2, x2]": [252, 142, 398, 842],
      "text": "Broadly speaking, model selection starts with assessing task complexity. Large foun-\ndation models—such as GPT-5 or Claude Opus 4.1—are well suited for agents oper-\nating in open-ended environments, where nuanced understanding, flexible reasoning,\nand creative generation are essential. These models offer impressive generalization\nand excel at tasks involving ambiguity, contextual nuance, or multiple steps. However,\ntheir strengths come at a cost: they require significant computational resources, often\ndemand cloud infrastructure, and introduce higher latency. They are best reserved for\napplications like personal assistants, research agents, or enterprise systems that must\nhandle a wide range of unpredictable queries."
    },
    {
      "[y1, x1, y2, x2]": [411, 142, 542, 842],
      "text": "In contrast, smaller models—such as distilled ModernBERT variants or Phi-4—are\noften more appropriate for agents performing well-defined, repetitive tasks. These\nmodels run efficiently on local hardware, respond quickly, and are less expensive to\ndeploy and maintain. They work well in structured settings like customer support,\ninformation retrieval, or data labeling, where precision is needed but creativity and\nflexibility are less important. When real-time responsiveness or resource constraints\nare critical, smaller models may outperform their larger counterparts simply by being\nmore practical."
    },
    {
      "[y1, x1, y2, x2]": [555, 142, 715, 842],
      "text": "An increasingly important dimension in model selection is modality. Agents today\noften need to process not just text, but also images, audio, or structured data. Multi-\nmodal models, such as GPT-5 and Claude 4.1, enable agents to interpret and combine\ndiverse data types—text, visuals, speech, and more. This expands the agent’s utility in\ndomains like healthcare, robotics, and customer support, where decisions rely on\nintegrating multiple forms of input. In contrast, text-only models remain ideal for\npurely language-driven use cases, offering lower complexity and faster inference in\nscenarios where additional modalities provide little added value."
    },
    {
      "[y1, x1, y2, x2]": [728, 142, 859, 842],
      "text": "Another key consideration is openness and customizability. Open source models,\nsuch as Llama and DeepSeek, provide developers with full transparency and the abil-\nity to fine-tune or modify the model as needed. This flexibility is particularly impor-\ntant for privacy-sensitive, regulated, or domain-specific applications. Open source\nmodels can be hosted on private infrastructure, tailored to unique use cases, and\ndeployed without licensing costs—though they do require more engineering"
    },
    {
      "[y1, x1, y2, x2]": [923, 706, 936, 842],
      "text": "Model Selection | 21"
    }
  ],
  "page_4": [
    {
      "[y1, x1, y2, x2]": [84, 142, 158, 842],
      "text": "overhead. By contrast, proprietary models like GPT-5, Claude, and Cohere offer pow-\nerful capabilities via API and come with managed infrastructure, monitoring, and\nperformance optimizations. These models are ideal for teams seeking rapid develop-\nment and deployment, though customization is often limited and costs can scale\nquickly with usage."
    },
    {
      "[y1, x1, y2, x2]": [171, 142, 291, 842],
      "text": "The choice between using a pretrained general-purpose model or a custom-trained\nmodel depends on the specificity and stakes of the agent’s domain. Pretrained\nmodels—trained on broad internet-scale corpora—work well for general language\ntasks, rapid prototyping, and scenarios where domain precision is not critical. These\nmodels can often be lightly fine-tuned or adapted through prompting techniques to\nachieve strong performance with minimal effort. However, in specialized domains—\nsuch as medicine, law, or technical support—custom-trained models can provide sig-\nnificant advantages. By training on curated, domain-specific datasets, developers can\nendow agents with deeper expertise and contextual understanding, leading to more\naccurate and trustworthy outputs."
    },
    {
      "[y1, x1, y2, x2]": [304, 142, 379, 842],
      "text": "Cost and latency considerations often tip the scales in real-world deployments. Large\nmodels deliver high performance but are expensive to run and may introduce\nresponse delays. In cases where that is untenable, smaller models or compressed ver-\nsions of larger models provide a better balance. Many developers adopt hybrid strate-\ngies, where a powerful model handles the most complex queries and a lightweight\nmodel handles routine tasks. In some systems, dynamic model routing ensures that\neach request is evaluated and routed to the most appropriate model based on com-\nplexity or urgency—enabling systems to optimize both cost and quality."
    },
    {
      "[y1, x1, y2, x2]": [392, 142, 538, 842],
      "text": "The Center for Research on Foundation Models at Stanford University has released\nthe Holistic Evaluation of Language Models, providing rigorous third-party perfor-\nmance measurement across a wide range of models. In Table 2-1, a small selection of\nlanguage models are shown along with their performance on the Massive Multitask\nLanguage Understanding (MMLU) benchmark, a commonly used general assessment\nof these models’ abilities. These measurements are not perfect, but they provide us\nwith a common ruler with which to compare performance. In general, we see that\nlarger models perform better, but inconsistently (some models perform better than\ntheir size would suggest). Significantly more computation resources are required to\nobtain high performance."
    },
    {
      "[y1, x1, y2, x2]": [759, 142, 772, 696],
      "text": "Table 2-1. Selected open weight models by performance and size"
    },
    {
      "[y1, x1, y2, x2]": [785, 142, 882, 858],
      "table": [
        [
          "Model",
          "Maintainer",
          "MMLU",
          "Parameters\n(billion)",
          "VRAM (full precision\nmodel in GB)",
          "Sample hardware\nrequired"
        ],
        [
          "Llama 3.1 Instruct\nTurbo",
          "Meta",
          "56.1",
          "8",
          "20",
          "RTX 3090"
        ],
        [
          "Gemma 2",
          "Google",
          "72.1",
          "9",
          "22.5",
          "RTX 3090"
        ]
      ]
    },
    {
      "[y1, x1, y2, x2]": [923, 142, 936, 427],
      "text": "22 | Chapter 2: Designing Agent Systems"
    }
  ],
  "page_5": [
    {
      "[y1, x1, y2, x2]": [84, 142, 222, 858],
      "table": [
        [
          "Model",
          "Maintainer",
          "MMLU",
          "Parameters\n(billion)",
          "VRAM (full precision\nmodel in GB)",
          "Sample hardware\nrequired"
        ],
        [
          "NeMo",
          "Mistral",
          "65.3",
          "12",
          "24",
          "RTX 3090"
        ],
        [
          "Phi-3",
          "Microsoft",
          "77.5",
          "14.7",
          "29.4",
          "A100"
        ],
        [
          "Qwen1.5",
          "Alibaba",
          "74.4",
          "32",
          "60.11",
          "A100"
        ],
        [
          "Llama 3",
          "Meta",
          "79.3",
          "70",
          "160",
          "4xA100"
        ]
      ]
    },
    {
      "[y1, x1, y2, x2]": [238, 142, 470, 842],
      "text": "Conversely, this means moderate performance can be obtained at a small fraction of\nthe cost. As you’ll see in Table 2-1, models up to roughly 14 billion parameters can be\nrun on a single consumer-grade graphics processing unit (GPU), such as NVIDIA’s\nRTX 3090 with 24 GB of video RAM. Above this threshold, though, you will probably\nwant a server-grade GPU such as NVIDIA’s A100, which comes in 40 GB and 80 GB\nvarieties. Models are called “open weight” when the architecture and weights (or\nparameters) of the model have been released freely to the public, so anyone with the\nnecessary hardware can load and use the model for inference without paying for\naccess. We will not get into the details of hardware selection, but these select open\nweight models show a range of performance levels at different sizes. These small,\nopen weight models continue to improve at a rapid pace, bringing increasing\namounts of intelligence into smaller form factors. While they might not work well for\nyour hardest problems, they can handle easier, more routine tasks at a fraction of the\nprice. For our example ecommerce support agent, a small fast model suffices—but if\nwe expanded into product recommendations or sentiment-based escalation, a larger\nmodel could unlock new capabilities."
    },
    {
      "[y1, x1, y2, x2]": [483, 142, 613, 842],
      "text": "Now let’s take a look at several of the large flagship models. Note that two of these\nmodels, DeepSeek-v3 and Llama 3.1 Instruct Turbo 405B, have been released as open\nweight models but the others have not. That said, these large models typically require\nat least 12 GPUs for reasonable performance, but they can require many more. These\nlarge models are almost always used on servers in large data centers. Typically, the\nmodel trainers charge for access to these models based on the number of input and\noutput tokens. The advantage of this is that the developer does not need to worry\nabout servers and GPU utilization but can begin building right away. Table 2-2 shows\nthe model costs and performance on the same MMLU benchmark."
    },
    {
      "[y1, x1, y2, x2]": [727, 142, 739, 663],
      "text": "Table 2-2. Selected large models by performance and cost"
    },
    {
      "[y1, x1, y2, x2]": [755, 142, 900, 825],
      "table": [
        [
          "Model",
          "Maintainer",
          "MMLU",
          "Relative price per million\ninput tokens",
          "Relative price per million\noutput tokens"
        ],
        [
          "DeepSeek-v3",
          "DeepSeek",
          "87.2",
          "2.75",
          "3.65"
        ],
        [
          "Claude 4 Opus Extended Thinking",
          "Anthropic",
          "86.5",
          "75",
          "125"
        ],
        [
          "Gemini 2.5 Pro",
          "Google",
          "86.2",
          "12.5",
          "25"
        ],
        [
          "Llama 3.1 Instruct Turbo 405B",
          "Meta",
          "84.5",
          "1",
          "1"
        ],
        [
          "04-mini",
          "OpenAl",
          "83.2",
          "5.5",
          "7.33"
        ]
      ]
    },
    {
      "[y1, x1, y2, x2]": [923, 706, 936, 842],
      "text": "Model Selection | 23"
    }
  ],
  "page_6": [
    {
      "[y1, x1, y2, x2]": [84, 142, 171, 858],
      "table": [
        [
          "Model",
          "Maintainer",
          "MMLU",
          "Relative price per million\ninput tokens",
          "Relative price per million\noutput tokens"
        ],
        [
          "Grok 3",
          "ΧΑΙ",
          "79.9",
          "15",
          "25"
        ],
        [
          "Nova Pro",
          "Amazon",
          "82.0",
          "4",
          "5.33"
        ],
        [
          "Mistral Large 2",
          "Mistral",
          "80.0",
          "10",
          "10"
        ]
      ]
    },
    {
      "[y1, x1, y2, x2]": [198, 142, 298, 842],
      "text": "In Table 2-2, prices are shown as a multiple of the price per million tokens on Llama\n3.1, which was the least expensive at the time of publishing. At the time of publishing,\nMeta is charging $0.20 per million input tokens and $0.60 per million output tokens.\nYou might also notice that performance does not directly correlate to price. Also\nknow that performance on benchmarks offers useful guidance, but your mileage may\nvary in how these benchmarks align with your particular task. When possible, com-\npare the model for your task and find the model that provides you with the best price\nper performance."
    },
    {
      "[y1, x1, y2, x2]": [311, 142, 411, 842],
      "text": "Ultimately, model selection is not a onetime decision but a strategic design choice\nthat must be revisited as agent capabilities, user needs, and infrastructure evolve.\nDevelopers must weigh trade-offs between generality and specialization, performance\nand cost, simplicity and extensibility. By carefully considering the task complexity,\ninput modalities, operational constraints, and customization needs, teams can choose\nmodels that enable their agents to act efficiently, scale reliably, and perform with pre-\ncision in the real world."
    },
    {
      "[y1, x1, y2, x2]": [510, 142, 534, 219],
      "text": "Tools"
    },
    {
      "[y1, x1, y2, x2]": [551, 142, 626, 842],
      "text": "In agent-based systems, tools are the fundamental capabilities that enable agents to\nperform specific actions or solve problems. Tools represent the functional building\nblocks of an agent, providing the ability to execute tasks and interact with both users\nand other systems. An agent’s effectiveness depends on the range and sophistication\nof its tools."
    },
    {
      "[y1, x1, y2, x2]": [655, 142, 679, 622],
      "text": "Designing Capabilities for Specific Tasks"
    },
    {
      "[y1, x1, y2, x2]": [696, 142, 756, 842],
      "text": "Tools are typically tailored to the tasks that the agent is designed to solve. When\ndesigning tools, developers must consider how the agent will perform under different\nconditions and contexts. A well-designed toolset ensures that the agent can handle a\nvariety of tasks with precision and efficiency. Tools can be divided into three main\ncategories:"
    },
    {
      "[y1, x1, y2, x2]": [802, 142, 814, 237],
      "text": "Local tools"
    },
    {
      "[y1, x1, y2, x2]": [827, 142, 887, 842],
      "text": "These are actions that the agent performs based on internal logic and computa-\ntions without external dependencies. Local tools are often rule-based or involve\nexecuting predefined functions. Examples include mathematical calculations,\ndata retrieval from local databases, or simple decision making based on"
    },
    {
      "[y1, x1, y2, x2]": [923, 142, 936, 427],
      "text": "24 | Chapter 2: Designing Agent Systems"
    }
  ],
  "page_7": [
    {
      "[y1, x1, y2, x2]": [84, 142, 114, 842],
      "text": "predefined rules (e.g., deciding whether to approve or deny a request based on set\ncriteria)."
    },
    {
      "[y1, x1, y2, x2]": [127, 142, 139, 272],
      "text": "API-based tools"
    },
    {
      "[y1, x1, y2, x2]": [152, 142, 242, 842],
      "text": "API-based tools enable agents to interact with external services or data sources.\nThese tools enable agents to extend their capabilities beyond the local environ-\nment by fetching real-time data or leveraging third-party systems. For instance, a\nvirtual assistant might use an API to pull weather data, stock prices, or social\nmedia updates, enabling it to provide more contextual and relevant responses to\nuser queries."
    },
    {
      "[y1, x1, y2, x2]": [272, 142, 284, 431],
      "text": "Model Context Protocol (MCP)"
    },
    {
      "[y1, x1, y2, x2]": [297, 142, 443, 842],
      "text": "MCP-based tools enable agents to provide structured, real-time context to lan-\nguage models using the Model Context Protocol, a standardized schema for pass-\ning external knowledge, memory, and state into the model’s prompt. Unlike\ntraditional API calls that require full round-trip execution, MCP enables agents\nto inject rich, dynamic context—such as user profiles, conversation history, world\nstate, or task-specific metadata—directly into the model’s reasoning process\nwithout invoking separate tools. They are particularly effective in reducing\nredundant tool use, preserving conversational state, and injecting real-time situa-\ntional awareness into model behavior."
    },
    {
      "[y1, x1, y2, x2]": [456, 142, 531, 842],
      "text": "While local tools enable agents to perform tasks independently using internal logic\nand rule-based functions, such as calculations or data retrieval from local databases,\nAPI-based tools enable agents to connect with external services. This allows for the\naccess of real-time data or third-party systems to provide contextually relevant\nresponses and extended functionality."
    },
    {
      "[y1, x1, y2, x2]": [584, 142, 608, 484],
      "text": "Tool Integration and Modularity"
    },
    {
      "[y1, x1, y2, x2]": [625, 142, 739, 842],
      "text": "Modular design is critical for tool development. Each tool should be designed as a\nself-contained module that can be easily integrated or replaced as needed. This\napproach enables developers to update or extend the agent’s functionality without\noverhauling the entire system. A customer service chatbot might start with a basic set\nof tools for handling simple queries and later have more complex tools (e.g., dispute\nresolution or advanced troubleshooting) added without disrupting the agent’s core\noperations."
    },
    {
      "[y1, x1, y2, x2]": [772, 142, 796, 258],
      "text": "Memory"
    },
    {
      "[y1, x1, y2, x2]": [812, 142, 872, 842],
      "text": "Memory is an essential component that enables agents to store and retrieve informa-\ntion, enabling them to maintain context, learn from past interactions, and improve\ndecision making over time. Effective memory management ensures that agents can"
    },
    {
      "[y1, x1, y2, x2]": [923, 755, 936, 842],
      "text": "Memory | 25"
    }
  ],
  "page_8": [
    {
      "[y1, x1, y2, x2]": [84, 142, 126, 842],
      "text": "operate efficiently in dynamic environments and adapt to new situations based on\nhistorical data. We’ll discuss memory in much more detail in Chapter 6."
    },
    {
      "[y1, x1, y2, x2]": [140, 142, 164, 396],
      "text": "Short-Term Memory"
    },
    {
      "[y1, x1, y2, x2]": [180, 142, 255, 842],
      "text": "Short-term memory refers to an agent’s ability to store and manage information rele-\nvant to the current task or conversation. This type of memory is typically used to\nmaintain context during an interaction, enabling the agent to make coherent deci-\nsions in real time. A customer service agent that remembers a user’s previous queries\nwithin a session can provide more accurate and context-aware responses, enhancing\nuser experience."
    },
    {
      "[y1, x1, y2, x2]": [268, 142, 343, 842],
      "text": "Short-term memory is often implemented using rolling context windows, which\nenable the agent to maintain a sliding window of recent information while discarding\noutdated data. This is particularly useful in applications like chatbots or virtual assis-\ntants, where the agent must remember recent interactions but can forget older, irrele-\nvant details."
    },
    {
      "[y1, x1, y2, x2]": [406, 142, 430, 390],
      "text": "Long-Term Memory"
    },
    {
      "[y1, x1, y2, x2]": [447, 142, 507, 842],
      "text": "Long-term memory, on the other hand, enables agents to store knowledge and expe-\nriences over extended periods, enabling them to draw on past information to inform\nfuture actions. This is particularly important for agents that need to improve over\ntime or provide personalized experiences based on user preferences."
    },
    {
      "[y1, x1, y2, x2]": [520, 142, 608, 842],
      "text": "Long-term memory is often implemented using databases, knowledge graphs, or\nfine-tuned models. These structures enable agents to store structured data (e.g., user\npreferences, historical performance metrics) and retrieve it when needed. A health-\ncare monitoring agent might retain long-term data on a patient’s vital signs, enabling\nit to detect trends or provide historical insights to healthcare providers."
    },
    {
      "[y1, x1, y2, x2]": [638, 142, 662, 532],
      "text": "Memory Management and Retrieval"
    },
    {
      "[y1, x1, y2, x2]": [678, 142, 753, 842],
      "text": "Effective memory management involves organizing and indexing stored data so that\nit can be easily retrieved when needed. Agents that rely on memory must be able to\ndifferentiate between relevant and irrelevant data and retrieve information quickly to\nensure seamless performance. In some cases, agents may also need to forget certain\ninformation to avoid cluttering their memory with outdated or unnecessary details."
    },
    {
      "[y1, x1, y2, x2]": [766, 142, 826, 842],
      "text": "An ecommerce recommendation agent must store user preferences and past purchase\nhistory to provide personalized recommendations. However, it must also prioritize\nrecent data to ensure that recommendations remain relevant and accurate as user\npreferences change over time."
    },
    {
      "[y1, x1, y2, x2]": [923, 142, 936, 427],
      "text": "26 | Chapter 2: Designing Agent Systems"
    }
  ],
  "page_9": [
    {
      "[y1, x1, y2, x2]": [84, 142, 108, 321],
      "text": "Orchestration"
    },
    {
      "[y1, x1, y2, x2]": [125, 142, 239, 842],
      "text": "Orchestration is what turns isolated capabilities into end-to-end solutions: it’s the\nlogic that composes, schedules, and supervises a series of skills so that each action\nflows into the next and works toward a clear objective. At its core, orchestration eval-\nuates possible sequences of tool or skill invocations, forecasts their likely outcomes,\nand picks the path most likely to succeed in multistep tasks—whether that’s plotting\nan optimal delivery route that balances traffic, time windows, and vehicle availability,\nor assembling a complex data-processing pipeline."
    },
    {
      "[y1, x1, y2, x2]": [252, 142, 352, 842],
      "text": "Because real-world conditions can change in an instant—new information arrives,\npriorities shift, or resources become unavailable—an orchestrator must continuously\nmonitor both progress and environment, pausing or rerouting workflows as needed\nto stay on course. In many scenarios, agents build plans incrementally: they execute a\nhandful of steps, then reassess and update the remaining workflow based on fresh\nresults. A conversational assistant, for example, might confirm each subtask’s out-\ncome before planning the next, dynamically adapting its sequence to ensure respon-\nsiveness and robustness."
    },
    {
      "[y1, x1, y2, x2]": [365, 142, 425, 842],
      "text": "Without a solid orchestration layer, even the most powerful skills risk running at\ncross-purposes or stalling entirely. We’ll dig into the patterns, architectures, and best\npractices for building resilient, flexible orchestration engines in Chapter 5."
    },
    {
      "[y1, x1, y2, x2]": [471, 142, 495, 360],
      "text": "Design Trade-Offs"
    },
    {
      "[y1, x1, y2, x2]": [512, 142, 587, 842],
      "text": "Designing agent-based systems involves balancing multiple trade-offs to optimize\nperformance, scalability, reliability, and cost. These trade-offs require developers to\nmake strategic decisions that can significantly impact how the agent performs in real-\nworld environments. This section explores the critical trade-offs involved in creating\neffective agent systems and provides guidance on how to approach these challenges."
    },
    {
      "[y1, x1, y2, x2]": [616, 142, 640, 582],
      "text": "Performance: Speed/Accuracy Trade-Offs"
    },
    {
      "[y1, x1, y2, x2]": [657, 142, 732, 842],
      "text": "A key trade-off in agent design is balancing speed and accuracy. High performance\noften enables an agent to quickly process information, make decisions, and execute\ntasks, but this can come at the expense of precision. Conversely, focusing on accuracy\ncan slow the agent down, particularly when complex models or computationally\nintensive techniques are required."
    },
    {
      "[y1, x1, y2, x2]": [745, 142, 820, 842],
      "text": "In real-time environments, such as autonomous vehicles or trading systems, rapid\ndecision making is essential, with milliseconds sometimes making a critical differ-\nence; here, prioritizing speed over accuracy may be necessary to ensure timely\nresponses. However, tasks like legal analysis or medical diagnostics require high pre-\ncision, making it acceptable to sacrifice some speed to ensure reliable results."
    },
    {
      "[y1, x1, y2, x2]": [923, 686, 936, 842],
      "text": "Design Trade-Offs | 27"
    }
  ],
  "page_10": [
    {
      "[y1, x1, y2, x2]": [84, 142, 144, 842],
      "text": "A hybrid approach can also be effective, where an agent initially provides a fast,\napproximate response and then refines it with a more accurate follow-up. This\napproach is common in recommendation systems or diagnostics, where a quick ini-\ntial suggestion is validated and improved with additional time and data."
    },
    {
      "[y1, x1, y2, x2]": [173, 142, 197, 725],
      "text": "Scalability: Engineering Scalability for Agent Systems"
    },
    {
      "[y1, x1, y2, x2]": [214, 142, 328, 842],
      "text": "Scalability is a critical challenge for modern agent-based systems, especially those that\nrely heavily on deep learning models and real-time processing. As agent systems grow\nin complexity, data volume, and task concurrency, it becomes critical to manage com-\nputational resources, particularly GPUs. GPUs are the backbone for accelerating the\ntraining and inference of large AI models, but efficient scaling requires careful engi-\nneering to avoid bottlenecks, underutilization, and rising operational costs. This sec-\ntion outlines strategies for effectively scaling agent systems by optimizing GPU\nresources and architecture."
    },
    {
      "[y1, x1, y2, x2]": [341, 142, 472, 842],
      "text": "GPU resources are often the most expensive and limiting factor in scaling agent sys-\ntems, making their efficient use a top priority. Proper resource management enables\nagents to handle increasing workloads while minimizing the latency and cost associ-\nated with high-performance computing. A critical strategy for scalability is dynamic\nGPU allocation, which involves assigning GPU resources based on real-time demand.\nInstead of statically allocating GPUs to agents or tasks, dynamic allocation ensures\nthat GPUs are only used when necessary, reducing idle time and optimizing\nutilization."
    },
    {
      "[y1, x1, y2, x2]": [485, 142, 545, 842],
      "text": "Elastic GPU provisioning further enhances efficiency, using cloud services or on-\npremises GPU clusters that automatically scale resources based on current workloads.\nPriority queuing and intelligent task scheduling add another layer of efficiency, giving\nhigh-priority tasks immediate GPU access while queuing less critical ones during\npeak times."
    },
    {
      "[y1, x1, y2, x2]": [558, 142, 633, 842],
      "text": "In large-scale agent systems, latency can become a significant issue, particularly when\nagents need to interact in real-time or near-real-time environments. Optimizing for\nminimal latency is essential for ensuring that agents remain responsive and capable of\nmeeting performance requirements. Scheduling GPU tasks efficiently across dis-\ntributed systems can reduce latency and ensure that agents operate smoothly under\nheavy loads."
    },
    {
      "[y1, x1, y2, x2]": [646, 142, 706, 842],
      "text": "One effective strategy is asynchronous task execution, which enables GPU tasks to be\nprocessed in parallel without waiting for previous tasks to be completed, maximizing\nGPU resource utilization and reducing idle time between tasks."
    },
    {
      "[y1, x1, y2, x2]": [719, 142, 779, 842],
      "text": "Another strategy is dynamic load balancing across GPUs, which prevents any single\nGPU from becoming a bottleneck by distributing tasks to underutilized resources.\nFor agent systems reliant on GPU-intensive tasks, such as running complex inference"
    },
    {
      "[y1, x1, y2, x2]": [923, 142, 936, 427],
      "text": "28 | Chapter 2: Designing Agent Systems"
    }
  ],
  "page_11": [
    {
      "[y1, x1, y2, x2]": [84, 142, 144, 842],
      "text": "algorithms, scaling effectively requires more than simply adding GPUs; it demands\ncareful optimization to ensure that resources are fully utilized, enabling the system to\nmeet growing demands efficiently."
    },
    {
      "[y1, x1, y2, x2]": [157, 142, 202, 842],
      "text": "To scale GPU-intensive systems effectively, it requires more than just adding GPUs—\nit involves ensuring that GPU resources are fully utilized and that the system can\nscale efficiently as demands grow."
    },
    {
      "[y1, x1, y2, x2]": [215, 142, 260, 842],
      "text": "Horizontal scaling involves expanding the system by adding more GPU nodes to han-\ndle increasing workloads. In a cluster setup, GPUs can work together to manage high-\nvolume tasks such as real-time inference or model training."
    },
    {
      "[y1, x1, y2, x2]": [273, 142, 363, 842],
      "text": "For agent systems with varying workloads, using a hybrid cloud approach can\nimprove scalability by combining on-premises GPU resources with cloud-based\nGPUs. During peak demand, the system can use burst scaling, in which tasks are off-\nloaded to temporary cloud GPUs, scaling up computational capacity without requir-\ning a permanent investment in physical infrastructure. Once demand decreases, these\nresources can be released, ensuring cost-efficiency."
    },
    {
      "[y1, x1, y2, x2]": [376, 142, 421, 842],
      "text": "Using cloud-based GPU instances during off-peak hours, when demand is lower and\npricing is more favorable, can significantly reduce operating costs while maintaining\nthe flexibility to scale up when needed."
    },
    {
      "[y1, x1, y2, x2]": [434, 142, 538, 842],
      "text": "Scaling agent systems effectively—particularly those reliant on GPU resources—\nrequires a careful balance between maximizing GPU efficiency, minimizing latency,\nand ensuring that the system can handle dynamic workloads. By adopting strategies\nsuch as dynamic GPU allocation, multi-GPU parallelism, distributed inference, and\nhybrid cloud infrastructures, agent systems can scale to meet growing demands while\nmaintaining high performance and cost efficiency. GPU resource management tools\nplay a critical role in this process, providing the oversight necessary to ensure seam-\nless scalability as agent systems grow in complexity and scope."
    },
    {
      "[y1, x1, y2, x2]": [611, 142, 635, 786],
      "text": "Reliability: Ensuring Robust and Consistent Agent Behavior"
    },
    {
      "[y1, x1, y2, x2]": [652, 142, 727, 842],
      "text": "Reliability refers to the agent’s ability to perform its tasks consistently and accurately\nover time. A reliable agent must handle expected and unexpected conditions without\nfailure, ensuring a high level of trust from users and stakeholders. However, improv-\ning reliability often involves trade-offs in system complexity, cost, and development\ntime."
    },
    {
      "[y1, x1, y2, x2]": [757, 142, 769, 273],
      "text": "Fault tolerance"
    },
    {
      "[y1, x1, y2, x2]": [782, 142, 842, 842],
      "text": "One key aspect of reliability is ensuring that agents can handle errors or unexpected\nevents without crashing or behaving unpredictably. This may involve building in fault\ntolerance, where the agent can detect failures (e.g., network interruptions, hardware\nfailures) and recover gracefully. Fault-tolerant systems often employ redundancy—"
    },
    {
      "[y1, x1, y2, x2]": [923, 686, 936, 842],
      "text": "Design Trade-Offs | 29"
    }
  ],
  "page_12": [
    {
      "[y1, x1, y2, x2]": [84, 142, 114, 842],
      "text": "duplicating critical components or processes to ensure that failures in one part of the\nsystem do not affect overall performance."
    },
    {
      "[y1, x1, y2, x2]": [139, 142, 151, 381],
      "text": "Consistency and robustness"
    },
    {
      "[y1, x1, y2, x2]": [164, 142, 254, 842],
      "text": "For agents to be reliable, they must perform consistently across different scenarios,\ninputs, and environments. This is particularly important in safety-critical systems,\nsuch as autonomous vehicles or healthcare agents, where a mistake could have seri-\nous consequences. Developers must ensure that the agent performs well not only in\nideal conditions but also under edge cases, stress tests, and real-world constraints.\nAchieving reliability requires:"
    },
    {
      "[y1, x1, y2, x2]": [284, 142, 296, 293],
      "text": "Extensive testing"
    },
    {
      "[y1, x1, y2, x2]": [309, 179, 369, 842],
      "text": "Agents should undergo rigorous testing, including unit tests, integration tests,\nand simulations of real-world scenarios. Tests should cover edge cases, unexpec-\nted inputs, and adversarial conditions to ensure that the agent can handle diverse\nenvironments."
    },
    {
      "[y1, x1, y2, x2]": [399, 142, 411, 404],
      "text": "Monitoring and feedback loops"
    },
    {
      "[y1, x1, y2, x2]": [424, 179, 484, 842],
      "text": "Reliable agents require continuous monitoring in production to detect anomalies\nand adjust their behavior in response to changing conditions. Feedback loops\nenable agents to learn from their environment and improve performance over\ntime, increasing their robustness."
    },
    {
      "[y1, x1, y2, x2]": [514, 142, 538, 597],
      "text": "Costs: Balancing Performance and Expense"
    },
    {
      "[y1, x1, y2, x2]": [555, 142, 615, 842],
      "text": "Cost is an often-overlooked but critical trade-off in the design of agent-based sys-\ntems. The costs associated with developing, deploying, and maintaining an agent\nmust be weighed against the expected benefits and return on investment (ROI). Cost\nconsiderations affect decisions related to model complexity, infrastructure, and\nscalability."
    },
    {
      "[y1, x1, y2, x2]": [645, 142, 657, 313],
      "text": "Development costs"
    },
    {
      "[y1, x1, y2, x2]": [670, 142, 745, 842],
      "text": "Developing sophisticated agents can be expensive, especially when using advanced\nmachine learning (ML) models that require large datasets, specialized expertise, and\nsignificant computational resources for training. Additionally, the need for iterative\ndesign, testing, and optimization increases development costs."
    },
    {
      "[y1, x1, y2, x2]": [758, 142, 833, 842],
      "text": "Complex agents frequently necessitate a team with specialized talent, including data\nscientists, ML engineers, and domain experts, to create high-performing systems.\nAdditionally, building a reliable and scalable agent system requires extensive testing\ninfrastructure, often involving simulation environments and investments in testing\ntools and frameworks to ensure robust functionality."
    },
    {
      "[y1, x1, y2, x2]": [923, 142, 936, 427],
      "text": "30 | Chapter 2: Designing Agent Systems"
    }
  ],
  "page_13": [
    {
      "[y1, x1, y2, x2]": [84, 142, 96, 301],
      "text": "Operational costs"
    },
    {
      "[y1, x1, y2, x2]": [109, 142, 199, 842],
      "text": "After deployment, the operational costs of running agents can become substantial,\nparticularly for systems requiring high computational power, such as those involving\nreal-time decision making or continuous data processing. Key contributors to these\nexpenses include the need for significant compute power, as agents running deep\nlearning models or complex algorithms often rely on costly hardware like GPUs or\ncloud services."
    },
    {
      "[y1, x1, y2, x2]": [212, 142, 287, 842],
      "text": "Additionally, agents that process vast amounts of data or maintain extensive memory\nincur higher costs for data storage and bandwidth. Regular maintenance and updates,\nincluding bug fixes and system improvements, further add to operational expenses as\nresources are needed to ensure the system’s reliability and performance over time."
    },
    {
      "[y1, x1, y2, x2]": [317, 142, 329, 292],
      "text": "Cost versus value"
    },
    {
      "[y1, x1, y2, x2]": [342, 142, 427, 842],
      "text": "Ultimately, the cost of an agent-based system must be justified by the value it delivers.\nIn some cases, it may make sense to prioritize cheaper, simpler agents for less critical\ntasks, while investing heavily in more sophisticated agents for mission-critical appli-\ncations. Decisions around cost must be made in the context of the system’s overall\ngoals and expected lifespan. Some optimization strategies include:"
    },
    {
      "[y1, x1, y2, x2]": [457, 142, 469, 252],
      "text": "Lean models"
    },
    {
      "[y1, x1, y2, x2]": [482, 179, 542, 842],
      "text": "Using simpler, more efficient models where appropriate can help reduce both\ndevelopment and operational costs. For example, if a rule-based system can\nachieve similar results to a deep learning model for a given task, the simpler\napproach will often be more cost-effective."
    },
    {
      "[y1, x1, y2, x2]": [572, 142, 584, 344],
      "text": "Cloud-based resources"
    },
    {
      "[y1, x1, y2, x2]": [597, 179, 642, 842],
      "text": "Leveraging cloud computing resources can reduce up-front infrastructure costs,\nestablishing a more scalable, pay-as-you-go model."
    },
    {
      "[y1, x1, y2, x2]": [655, 142, 667, 407],
      "text": "Open source models and tools"
    },
    {
      "[y1, x1, y2, x2]": [680, 179, 725, 842],
      "text": "Utilizing open source ML libraries and frameworks can help minimize software\ndevelopment costs while still delivering high-quality agents."
    },
    {
      "[y1, x1, y2, x2]": [738, 142, 838, 842],
      "text": "Designing agent systems involves balancing several critical trade-offs. Prioritizing\nperformance may require sacrificing some accuracy, while scaling to a multiagent\narchitecture introduces challenges in coordination and consistency. Ensuring reliabil-\nity demands rigorous testing and monitoring but can increase development time and\ncomplexity. Finally, cost considerations must be factored in from both a development\nand operational perspective, ensuring that the system delivers value within budget\nconstraints. In the next section, we’ll review some of the most common design pat-\nterns used when building effective agentic systems."
    },
    {
      "[y1, x1, y2, x2]": [923, 686, 936, 842],
      "text": "Design Trade-Offs | 31"
    }
  ],
  "page_14": [
    {
      "[y1, x1, y2, x2]": [84, 142, 108, 483],
      "text": "Architecture Design Patterns"
    },
    {
      "[y1, x1, y2, x2]": [125, 142, 225, 842],
      "text": "The architectural design of agent-based systems determines how agents are struc-\ntured, how they interact with their environment, and how they perform tasks. The\nchoice of architecture influences the system’s scalability, maintainability, and flexibil-\nity. This section explores three common design patterns for agent-based systems—\nsingle-agent and multiagent architectures—and discusses their advantages, chal-\nlenges, and appropriate use cases. We’ll discuss this in far more detail in Chapter 8."
    },
    {
      "[y1, x1, y2, x2]": [254, 142, 278, 489],
      "text": "Single-Agent Architectures"
    },
    {
      "[y1, x1, y2, x2]": [295, 142, 355, 842],
      "text": "A single-agent architecture is among the simplest and most straightforward designs,\nwhere a single agent is responsible for managing and executing all tasks within a sys-\ntem. This agent interacts directly with its environment and independently handles\ndecision making, planning, and execution without relying on other agents."
    },
    {
      "[y1, x1, y2, x2]": [368, 142, 482, 842],
      "text": "Ideal for well-defined and narrow tasks, this architecture is best suited for workloads\nthat are manageable by a single entity. The simplicity of single-agent systems makes\nthem easy to design, develop, and deploy, as they avoid complexities related to coor-\ndination, communication, and synchronization across multiple components. With\nclear use cases, single-agent architectures excel in narrow-scope tasks that do not\nrequire collaboration or distributed efforts, such as simple chatbots handling basic\ncustomer queries (like FAQs and order tracking) and task-specific automation for\ndata entry or file management."
    },
    {
      "[y1, x1, y2, x2]": [495, 142, 555, 842],
      "text": "Single-agent setups work well in environments where the problem domain is well-\ndefined, tasks are straightforward, and there is no significant need for scaling. This\nmakes them a fit for customer service chatbots, general-purpose assistants, and code\ngeneration agents. We’ll discuss single-agent and multiagent architectures much more\nin Chapter 8."
    },
    {
      "[y1, x1, y2, x2]": [631, 142, 680, 842],
      "text": "Multiagent Architectures: Collaboration, Parallelism,\nand Coordination"
    },
    {
      "[y1, x1, y2, x2]": [697, 142, 787, 842],
      "text": "In multiagent architectures, multiple agents work together to achieve a common goal.\nThese agents may operate independently, in parallel, or through coordinated efforts,\ndepending on the nature of the tasks. Multiagent systems are often used in complex\nenvironments where different aspects of a task need to be managed by specialized\nagents or where parallel processing can improve efficiency and scalability, and they\nbring many advantages:"
    },
    {
      "[y1, x1, y2, x2]": [816, 142, 828, 453],
      "text": "Collaboration and specialization"
    },
    {
      "[y1, x1, y2, x2]": [841, 179, 887, 842],
      "text": "Each agent in a multiagent system can be designed to specialize in specific tasks\nor areas. For example, one agent may focus on data collection while another"
    },
    {
      "[y1, x1, y2, x2]": [923, 142, 936, 427],
      "text": "32 | Chapter 2: Designing Agent Systems"
    }
  ],
  "page_15": [
    {
      "[y1, x1, y2, x2]": [84, 179, 129, 842],
      "text": "processes the data, and a third agent manages user interactions. This division of\nlabor enables the system to handle complex tasks more efficiently than a single\nagent would."
    },
    {
      "[y1, x1, y2, x2]": [159, 142, 171, 241],
      "text": "Parallelism"
    },
    {
      "[y1, x1, y2, x2]": [184, 179, 244, 842],
      "text": "Multiagent architectures can leverage parallelism to perform multiple tasks\nsimultaneously. For instance, agents in a logistics system can simultaneously plan\ndifferent delivery routes, reducing overall processing time and improving\nefficiency."
    },
    {
      "[y1, x1, y2, x2]": [257, 142, 269, 345],
      "text": "Improved scalability"
    },
    {
      "[y1, x1, y2, x2]": [282, 179, 327, 842],
      "text": "As the system grows, additional agents can be introduced to handle more tasks or\nto distribute the workload. This makes multiagent systems highly scalable and\ncapable of managing larger and more complex environments."
    },
    {
      "[y1, x1, y2, x2]": [340, 142, 352, 381],
      "text": "Redundancy and resilience"
    },
    {
      "[y1, x1, y2, x2]": [365, 179, 439, 842],
      "text": "Because multiple agents operate independently, failure in one agent does not nec-\nessarily compromise the entire system. Other agents can continue to function or\neven take over the failed agent’s responsibilities, improving overall system\nreliability."
    },
    {
      "[y1, x1, y2, x2]": [452, 142, 492, 842],
      "text": "Despite these advantages, multiagent systems also come with significant challenges,\nwhich include:"
    },
    {
      "[y1, x1, y2, x2]": [522, 142, 534, 461],
      "text": "Coordination and communication"
    },
    {
      "[y1, x1, y2, x2]": [547, 179, 619, 842],
      "text": "Managing communication between agents can be complex. Agents must\nexchange information efficiently and coordinate their actions to avoid duplica-\ntion of efforts, conflicting actions, or resource contention. Without proper\norchestration, multiagent systems can become disorganized and inefficient."
    },
    {
      "[y1, x1, y2, x2]": [632, 142, 644, 357],
      "text": "Increased complexity"
    },
    {
      "[y1, x1, y2, x2]": [657, 179, 729, 842],
      "text": "While multiagent systems are powerful, they are also more challenging to design,\ndevelop, and maintain. The need for communication protocols, coordination\nstrategies, and synchronization mechanisms adds layers of complexity to the sys-\ntem architecture."
    },
    {
      "[y1, x1, y2, x2]": [742, 142, 754, 292],
      "text": "Lower efficiency"
    },
    {
      "[y1, x1, y2, x2]": [767, 179, 884, 842],
      "text": "While not always the case, multiagent systems often encounter reduced efficiency\ndue to higher token consumption when completing tasks. Because agents must\nfrequently communicate, share context, and coordinate actions, they consume\nmore processing power and resources compared with single-agent systems. This\nincreased token usage not only leads to higher computational costs but can also\nslow task completion if communication and coordination are not optimized.\nConsequently, while multiagent systems offer robust solutions for complex tasks,\ntheir efficiency challenges mean that careful resource management is crucial."
    },
    {
      "[y1, x1, y2, x2]": [923, 634, 936, 842],
      "text": "Architecture Design Patterns | 33"
    }
  ],
  "page_16": [
    {
      "[y1, x1, y2, x2]": [84, 142, 158, 842],
      "text": "Multiagent architectures are well suited for environments where tasks are complex,\ndistributed, or require specialization across different components. In these systems,\nmultiple agents contribute to solving complex, distributed problems, such as in finan-\ncial trading systems, cybersecurity investigations, or collaborative AI research\nplatforms."
    },
    {
      "[y1, x1, y2, x2]": [171, 142, 246, 842],
      "text": "Single-agent systems offer simplicity and are ideal for well-defined tasks. Multiagent\nsystems provide collaboration, parallelism, and scalability, making them suitable for\ncomplex environments. Choosing the right architecture depends on the complexity of\nthe task, the need for scalability, and the expected lifespan of the system. In the next\nsection, we’ll discuss some principles we can follow to get the best results from the\nagentic systems we build."
    },
    {
      "[y1, x1, y2, x2]": [292, 142, 316, 329],
      "text": "Best Practices"
    },
    {
      "[y1, x1, y2, x2]": [333, 142, 433, 842],
      "text": "Designing agent-based systems requires more than just building agents with the right\nmodels, skills, and architecture. To ensure that these systems perform optimally in\nreal-world conditions and continue to evolve as the environment changes, it’s essen-\ntial to follow best practices throughout the development lifecycle. This section high-\nlights three critical best practices—iterative design, evaluation strategy, and real-world\ntesting—that contribute to creating adaptable, efficient, and reliable agent systems."
    },
    {
      "[y1, x1, y2, x2]": [462, 142, 486, 335],
      "text": "Iterative Design"
    },
    {
      "[y1, x1, y2, x2]": [503, 142, 593, 842],
      "text": "Iterative design is a fundamental approach in agent development, emphasizing the\nimportance of building systems incrementally while continually incorporating feed-\nback. Instead of aiming for a perfect solution in the initial build, iterative design focu-\nses on creating small, functional prototypes that you can evaluate, improve, and\nrefine over multiple cycles. This process allows for quick identification of flaws, rapid\ncourse correction, and continuous system improvement, and it has multiple benefits:"
    },
    {
      "[y1, x1, y2, x2]": [623, 142, 635, 381],
      "text": "Early detection of issues"
    },
    {
      "[y1, x1, y2, x2]": [648, 179, 708, 842],
      "text": "By releasing early prototypes, developers can identify design flaws or perfor-\nmance bottlenecks before they become deeply embedded in the system. This ena-\nbles swift remediation of issues, reducing long-term development costs and\navoiding major refactors."
    },
    {
      "[y1, x1, y2, x2]": [738, 142, 750, 318],
      "text": "User-centric design"
    },
    {
      "[y1, x1, y2, x2]": [763, 179, 838, 842],
      "text": "Iterative design encourages frequent feedback from stakeholders, end users, and\nother developers. This feedback ensures that the agent system remains aligned\nwith the users’ needs and expectations. As agents are tested in real-world scenar-\nios, iterative improvements can fine-tune their behaviors and responses to better\nsuit the users they serve."
    },
    {
      "[y1, x1, y2, x2]": [923, 142, 936, 426],
      "text": "34 Chapter 2: Designing Agent Systems"
    }
  ],
  "page_17": [
    {
      "[y1, x1, y2, x2]": [84, 142, 96, 237],
      "text": "Scalability"
    },
    {
      "[y1, x1, y2, x2]": [109, 179, 184, 842],
      "text": "Starting with a minimal viable product (MVP) or basic agent enables the system\nto grow and evolve in manageable increments. As the system matures, new fea-\ntures and capabilities can be introduced gradually, ensuring that each addition is\nthoroughly tested before full deployment."
    },
    {
      "[y1, x1, y2, x2]": [197, 142, 210, 608],
      "text": "To adopt iterative design effectively, development teams should:"
    },
    {
      "[y1, x1, y2, x2]": [240, 142, 252, 401],
      "text": "Develop prototypes quickly"
    },
    {
      "[y1, x1, y2, x2]": [265, 179, 295, 842],
      "text": "Focus on building core functionality first. Don’t aim for perfection at this stage—\nbuild something that works and delivers value, even if it’s basic."
    },
    {
      "[y1, x1, y2, x2]": [308, 142, 320, 396],
      "text": "Test and gather feedback"
    },
    {
      "[y1, x1, y2, x2]": [333, 179, 393, 842],
      "text": "After each iteration, collect feedback from users, developers, and other stake-\nholders. Use this feedback to guide improvements and decide on the next itera-\ntion’s priorities."
    },
    {
      "[y1, x1, y2, x2]": [406, 142, 418, 309],
      "text": "Refine and repeat"
    },
    {
      "[y1, x1, y2, x2]": [431, 179, 491, 842],
      "text": "Based on feedback and performance data, make necessary changes and refine the\nsystem in the next iteration. Continue this cycle until the agent system meets its\nperformance, usability, and scalability goals."
    },
    {
      "[y1, x1, y2, x2]": [504, 142, 546, 842],
      "text": "Effective iterative design involves quickly developing functional prototypes, gathering\nfeedback after each iteration, and continuously refining the system based on insights\nto meet performance and usability goals."
    },
    {
      "[y1, x1, y2, x2]": [576, 142, 600, 381],
      "text": "Evaluation Strategy"
    },
    {
      "[y1, x1, y2, x2]": [617, 142, 741, 842],
      "text": "Evaluating the performance and reliability of agent-based systems is a critical part of\nthe development process. A robust evaluation ensures that agents are capable of han-\ndling real-world scenarios, performing under varying conditions, and meeting per-\nformance expectations. It involves a systematic approach to testing and validating\nagents across different dimensions, including accuracy, efficiency, robustness, and\nscalability. This section explores key strategies for creating a comprehensive evalua-\ntion framework for agent systems. We’ll cover measurement and validation in far\nmore depth in Chapter 9."
    },
    {
      "[y1, x1, y2, x2]": [754, 142, 814, 842],
      "text": "A robust evaluation process involves developing a comprehensive testing framework\nthat covers all aspects of the agent’s functionality. This framework ensures that the\nagent is thoroughly tested under a variety of scenarios, both expected and\nunexpected."
    },
    {
      "[y1, x1, y2, x2]": [827, 142, 887, 842],
      "text": "Functional testing focuses on verifying that the agent performs its core tasks cor-\nrectly. Each skill or module of the agent should be individually tested to ensure that it\nbehaves as expected across different inputs and scenarios. Key areas of focus include:"
    },
    {
      "[y1, x1, y2, x2]": [923, 722, 936, 842],
      "text": "Best Practices | 35"
    }
  ],
  "page_18": [
    {
      "[y1, x1, y2, x2]": [84, 142, 96, 255],
      "text": "Correctness"
    },
    {
      "[y1, x1, y2, x2]": [109, 179, 139, 842],
      "text": "Ensuring that the agent consistently delivers accurate and expected outputs based\non its design"
    },
    {
      "[y1, x1, y2, x2]": [152, 142, 164, 311],
      "text": "Boundary testing"
    },
    {
      "[y1, x1, y2, x2]": [177, 179, 222, 842],
      "text": "Evaluating how the agent handles edge cases and extreme inputs, such as very\nlarge datasets, unusual queries, or ambiguous instructions"
    },
    {
      "[y1, x1, y2, x2]": [235, 142, 247, 363],
      "text": "Task-specific metrics"
    },
    {
      "[y1, x1, y2, x2]": [260, 179, 320, 842],
      "text": "For agents handling domain-specific tasks (e.g., legal analysis, medical diagnos-\ntics), ensuring the system meets the domain’s accuracy and compliance\nrequirements"
    },
    {
      "[y1, x1, y2, x2]": [333, 142, 378, 842],
      "text": "For agent systems, particularly those powered by ML models, it is essential to evaluate\nthe agent’s ability to generalize beyond the specific scenarios it was trained on. This\nensures the agent can handle new, unseen situations while maintaining accuracy and\nreliability."
    },
    {
      "[y1, x1, y2, x2]": [391, 142, 451, 842],
      "text": "Agents often encounter tasks outside of their original training domain. A robust eval-\nuation should test the agent’s ability to adapt to these new tasks without requiring\nextensive retraining. This is particularly important for general-purpose agents or\nthose designed to operate in dynamic environments."
    },
    {
      "[y1, x1, y2, x2]": [464, 142, 509, 842],
      "text": "User experience is a key factor in determining the success of agent systems. It’s\nimportant to evaluate not only the technical performance of the agent but also how\nwell it meets user expectations in real-world applications."
    },
    {
      "[y1, x1, y2, x2]": [522, 142, 582, 842],
      "text": "Collecting feedback from actual users provides critical insights into how well the\nagent performs in practice. This feedback helps refine the agent’s behaviors, improv-\ning its effectiveness and user satisfaction, and can consist of the following:"
    },
    {
      "[y1, x1, y2, x2]": [612, 142, 624, 375],
      "text": "User satisfaction scores"
    },
    {
      "[y1, x1, y2, x2]": [637, 179, 682, 842],
      "text": "Use metrics like net promoter score (NPS) or customer satisfaction (CSAT) to\ngauge how users feel about their interactions with the agent."
    },
    {
      "[y1, x1, y2, x2]": [695, 142, 707, 344],
      "text": "Task completion rates"
    },
    {
      "[y1, x1, y2, x2]": [720, 179, 765, 842],
      "text": "Measure how often users successfully complete tasks with the agent’s help. Low\ncompletion rates may indicate confusion or inefficiencies in the agent’s design."
    },
    {
      "[y1, x1, y2, x2]": [778, 142, 790, 287],
      "text": "Explicit signals"
    },
    {
      "[y1, x1, y2, x2]": [803, 179, 878, 842],
      "text": "Create opportunities for users to provide their feedback, in such forms as\nthumbs-up and thumbs-down, star ratings, and the ability to accept, reject, or\nmodify the generated results, depending on the context. These signals can pro-\nvide a wealth of insight."
    },
    {
      "[y1, x1, y2, x2]": [923, 142, 936, 427],
      "text": "36 | Chapter 2: Designing Agent Systems"
    }
  ],
  "page_19": [
    {
      "[y1, x1, y2, x2]": [84, 142, 96, 280],
      "text": "Implicit signals"
    },
    {
      "[y1, x1, y2, x2]": [109, 179, 169, 842],
      "text": "Analyze user-agent interactions to identify common points of failure, such as\nmisinterpretations, delays, sentiment, or inappropriate responses. Interaction\nlogs can be mined for insights into areas where the agent needs improvement."
    },
    {
      "[y1, x1, y2, x2]": [182, 142, 282, 842],
      "text": "In some cases, it’s necessary to involve human experts in the evaluation process to\nassess the agent’s decision-making accuracy. Human-in-the-loop validation combines\nautomated evaluation with human judgment, ensuring that the agent’s performance\naligns with real-world standards. When feasible, human experts should review a sam-\nple of the agent’s outputs to verify correctness, ethical compliance, and alignment\nwith best practices, and these reviews can then be used to calibrate and improve auto-\nmated evaluations."
    },
    {
      "[y1, x1, y2, x2]": [295, 142, 385, 842],
      "text": "We should evaluate agents in environments that closely simulate their real-world\napplications. This helps ensure that the system can perform reliably outside of con-\ntrolled development conditions. Evaluate the agent across the full spectrum of its\noperational environment, from data ingestion and processing to task execution and\noutput generation. End-to-end testing ensures that the agent functions as expected\nacross multiple systems, data sources, and platforms."
    },
    {
      "[y1, x1, y2, x2]": [415, 142, 439, 360],
      "text": "Real-World Testing"
    },
    {
      "[y1, x1, y2, x2]": [456, 142, 560, 842],
      "text": "While building agents in a controlled development environment is crucial for initial\ntesting, it’s equally important to validate agents in real-world settings to ensure they\nperform as expected when interacting with live users or environments. Real-world\ntesting involves deploying agents in actual production environments and observing\ntheir behavior under real-life conditions. This stage of testing enables developers to\nuncover issues that may not have surfaced during earlier development stages and to\nevaluate the agent’s robustness, reliability, and user impact."
    },
    {
      "[y1, x1, y2, x2]": [573, 142, 648, 842],
      "text": "Real-world testing is essential for ensuring agents can manage the unpredictability\nand complexity of live environments. Unlike controlled testing, this approach reveals\nedge cases, unexpected user inputs, and performance under high demand, helping\ndevelopers refine the agent for robust, reliable operation:"
    },
    {
      "[y1, x1, y2, x2]": [678, 142, 690, 477],
      "text": "Exposure to real-world complexity"
    },
    {
      "[y1, x1, y2, x2]": [703, 179, 778, 842],
      "text": "In controlled environments, agents operate with predictable inputs and respon-\nses. However, real-world environments are dynamic and unpredictable, with\ndiverse users, edge cases, and unforeseen challenges. Testing in these environ-\nments ensures that the agent can handle the complexity and variability of real-\nworld scenarios."
    },
    {
      "[y1, x1, y2, x2]": [791, 142, 803, 364],
      "text": "Uncovering edge cases"
    },
    {
      "[y1, x1, y2, x2]": [816, 179, 876, 842],
      "text": "Real-world interactions often expose edge cases that may not have been accoun-\nted for in the design or testing phases. For example, a chatbot tested with scripted"
    },
    {
      "[y1, x1, y2, x2]": [923, 722, 936, 842],
      "text": "Best Practices | 37"
    }
  ],
  "page_20": [
    {
      "[y1, x1, y2, x2]": [84, 179, 144, 842],
      "text": "queries might perform well in development, but when exposed to real users, it\nmay struggle with unexpected inputs, ambiguous questions, or natural language\nvariations."
    },
    {
      "[y1, x1, y2, x2]": [157, 142, 169, 484],
      "text": "Evaluating performance under load"
    },
    {
      "[y1, x1, y2, x2]": [182, 179, 257, 842],
      "text": "Real-world testing also enables developers to observe how the agent performs\nunder high workloads or increased user demand. This is particularly important\nfor agents that operate in environments with fluctuating traffic, such as customer\nservice bots or ecommerce recommendation engines."
    },
    {
      "[y1, x1, y2, x2]": [270, 142, 330, 842],
      "text": "Real-world testing ensures an agent’s readiness for deployment by validating its per-\nformance under real-life conditions. This process involves a phased rollout, continu-\nous monitoring of key metrics, collecting user feedback, and iteratively refining the\nagent to optimize its capabilities and usability:"
    },
    {
      "[y1, x1, y2, x2]": [360, 142, 372, 310],
      "text": "Deploy in phases"
    },
    {
      "[y1, x1, y2, x2]": [385, 179, 445, 842],
      "text": "Roll out the agent in stages, starting with small-scale testing in a limited environ-\nment before scaling up to full deployment. This phased approach helps identify\nand address issues incrementally, without overwhelming the system or users."
    },
    {
      "[y1, x1, y2, x2]": [458, 142, 470, 369],
      "text": "Monitor agent behavior"
    },
    {
      "[y1, x1, y2, x2]": [483, 179, 558, 842],
      "text": "Use monitoring tools to track the agent’s behavior, responses, and performance\nmetrics during real-world testing. Monitoring should focus on key performance\nindicators (KPIs) such as response time, accuracy, user satisfaction, and system\nstability."
    },
    {
      "[y1, x1, y2, x2]": [571, 142, 583, 349],
      "text": "Collect user feedback"
    },
    {
      "[y1, x1, y2, x2]": [596, 179, 656, 842],
      "text": "Engage users during real-world testing to gather feedback on their experiences\nwhen interacting with the agent. User feedback is invaluable in identifying gaps,\nimproving usability, and ensuring that the agent meets real-world needs."
    },
    {
      "[y1, x1, y2, x2]": [669, 142, 681, 381],
      "text": "Iterate based on insights"
    },
    {
      "[y1, x1, y2, x2]": [694, 179, 754, 842],
      "text": "Real-world testing provides valuable insights that should be fed back into the\ndevelopment cycle. Use these insights to refine the agent, improve its capabilities,\nand optimize its performance for future iterations."
    },
    {
      "[y1, x1, y2, x2]": [767, 142, 857, 842],
      "text": "Following best practices such as iterative design, agile development, and real-world\ntesting is critical for building agent-based systems that are adaptable, scalable, and\nresilient. These practices ensure that agents are designed with flexibility, thoroughly\ntested in real-world conditions, and continuously improved to meet evolving user\nneeds and environmental challenges. By incorporating these approaches into the\ndevelopment lifecycle, developers can create more reliable, efficient, and effective\nagent systems capable of thriving in dynamic environments."
    },
    {
      "[y1, x1, y2, x2]": [923, 142, 936, 426],
      "text": "38 Chapter 2: Designing Agent Systems"
    }
  ]
}