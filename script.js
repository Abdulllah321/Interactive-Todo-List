import { categories } from "./constants.js";
import $ from "jquery";

import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

const firebaseConfig = {
  apiKey: "AIzaSyBy05XxrDbELTPhTBqBMut-5cY0rjAwGH4",
  authDomain: "todo-f656c.firebaseapp.com",
  projectId: "todo-f656c",
  storageBucket: "todo-f656c.appspot.com",
  messagingSenderId: "197067852047",
  appId: "1:197067852047:web:ed819f8b8dae4b277d567a",
  measurementId: "G-JJRRNTSHL2",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

$(document).ready(function () {
  $("#openLoginPopup").click(function () {
    $("#popup").removeClass("hidden").addClass("scale-100");
  });

  $("#closePopup").click(function () {
    $("#popup").addClass("hidden").removeClass("scale-100");
  });

  // Google Sign-In
  $("#googleSignIn").click(function () {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
      .then((result) => {
        console.log(result.user);
        alert("Signed in as " + result.user.displayName);
        $("#popup").addClass("hidden").removeClass("scale-100");
      })
      .catch((error) => {
        console.error(error);
      });
  });

  // Facebook Sign-In
  $("#facebookSignIn").click(function () {
    const provider = new FacebookAuthProvider();
    signInWithPopup(auth, provider)
      .then((result) => {
        console.log(result.user);
        alert("Signed in as " + result.user.displayName);
        $("#popup").addClass("hidden").removeClass("scale-100");
      })
      .catch(function (error) {
        console.error(error);
      });
  });
});

$(document).ready(function () {
  let TodoList = JSON.parse(localStorage.getItem("Todo")) || [];
  const urlParams = new URLSearchParams(window.location.search);
  const categoryParams = urlParams.get("category");
  let edit = false;

  if (categoryParams) {
    const subcategories = categories
      .find((cat) => cat.category === categoryParams)
      .subcategories.map((sub) => sub.name);
    const message = `Please suggest me todos about ${categoryParams} category and their subcategories. Subcategories: [${subcategories}]. Provide the answer in JSON format including all todos list suggestions with category and subcategory. {
        category: "category_name(e.g Personal,Work,Shopping,Education etc)"
        todos: [
          {name: "subcategory_name", todo: ["todos List Here"]}
        ]
      }`;
    getChatGPTSuggestions(message);
  }

  let filteredTodos = [];

  // Initialize category select box
  const selectBoxHtml = categories
    .map((cat) => `<option value="${cat.category}">${cat.category}</option>`)
    .join("");

  $("#category").html(`
    <option value="" disabled selected>Please select category</option>
    ${selectBoxHtml}
  `);

  function updateTodaysTasks() {
    const categoryTasks = categories.map((cat) => ({
      category: cat.category,
      tasks: TodoList.filter((todo) => todo.category === cat.category).length,
    }));

    categoryTasks.forEach((catTasks) => {
      const category = categories.find(
        (cat) => cat.category == catTasks.category
      );
      if (category) {
        category.tasksToday = catTasks.tasks;
      }
    });
  }

  updateTodaysTasks();

  function renderFiltersSlider() {
    const sliderHtml = categories
      .find((cat) => cat.category === categoryParams)
      ?.subcategories?.map((sub) => {
        // Filter todos once and store the result
        const filteredTodosCount = TodoList.filter(
          (todo) => todo.subcategory === sub.name
        ).length;

        return `
        <button class="flex gap-1 w-max rounded-full px-4 py-1 font-base text-sm divide-x-1 whitespace-nowrap cursor-pointer transition-all duration-300 ${
          filteredTodos.includes(sub.name)
            ? "bg-blue-400 text-white shadow-md"
            : "bg-gray-200 shadow-sm"
        }" 
        data-title="${sub.name}">
          <span>${sub.icon}</span> ${sub.name} ${
          filteredTodosCount !== 0 ? `(${filteredTodosCount})` : ""
        }
        </button>
      `;
      })
      .join("");

    $("#filter-slider").html(sliderHtml);
  }

  renderFiltersSlider();

  $(document).on("click", "#filter-slider button", function () {
    const value = $(this).data("title");
    if (!filteredTodos.includes(value)) {
      filteredTodos.push(value);
    } else {
      filteredTodos = filteredTodos.filter((item) => item !== value);
    }
    renderFiltersSlider();
    renderOutput();
  });

  // Drag to scroll functionality
  let isDown = false;
  let startX, scrollLeft;

  $("#filter-slider-container, #suggestion-slider-container").on({
    mousedown(e) {
      isDown = true;
      $("#filter-slider-container, #suggestion-slider-container").addClass(
        "active"
      );
      startX = e.pageX - $(this).scrollLeft();
      scrollLeft = $(this).scrollLeft();
    },
    mouseleave() {
      isDown = false;
      $("#filter-slider-container, #suggestion-slider-container").removeClass(
        "active"
      );
    },
    mouseup() {
      isDown = false;
      $("#filter-slider-container, #suggestion-slider-container").removeClass(
        "active"
      );
    },
    mousemove(e) {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - $(this).offset().left;
      const walk = x - startX;
      $(this).scrollLeft(scrollLeft - walk);
    },
  });

  function getSubCategory() {
    const selectedCategory = $("#category").val();
    if (selectedCategory != null) {
      $("#subcategory")
        .css({ opacity: 1, cursor: "default" })
        .removeAttr("disabled");
      const foundedCategory = categories
        .find((cat) => cat.category === selectedCategory)
        ?.subcategories.map(
          (sub) => `<option value="${sub.name}">${sub.name}</option>`
        )
        .join("");
      $("#subcategory").html(`
        <option value="" disabled selected>Please select category</option>
        ${foundedCategory}
      `);
    } else {
      if ($("#subcategory").length) {
        $("#subcategory")
          .css({ opacity: 0.3, cursor: "not-allowed" })
          .attr("disabled");
        $("#subcategory").html(
          '<option value="" disabled selected>First select a category</option>'
        );
      }
    }
  }

  $("#category").on("change", getSubCategory);

  $("#main-todo-heading").text(`${categoryParams} List`);

  function renderOutput() {
    const TodoListMap = TodoList.filter((todo) => {
      let renderValue;
      if (filteredTodos.length) {
        renderValue = filteredTodos.includes(todo.subcategory);
      } else {
        renderValue = todo.category === categoryParams;
      }
      return renderValue;
    })
      .map(
        (todo, index) => `
        <li class="px-4 py-2 font-semiBold text-md first:border-none border-t text-gray-700 transition-all duration-300 flex justify-between gap-2" data-id="${
          todo.id
        }" title="${todo.completed ? "completed" : "uncompleted"}">
          <h6 class="${
            todo.completed ? "line-through text-gray-400" : ""
          } todo-item cursor-pointer w-full">
            <span class="divide-x-1 divide-gray-400 mr-2">${index + 1}.</span>
            ${todo.title}
            <span class="text-xs text-gray-500" title="subcategory">(${
              todo.subcategory
            })</span>
          </h6>
          <div class="flex items-center gap-3">
            <i class="fa fa-check mr-2 transition-all duration-300 ${
              todo.completed ? "opacity-100" : "opacity-0"
            } text-green-500 opacity-0"></i>
            <i class="edit-button fa fa-edit text-blue-500 cursor-pointer"></i>
            <i class="delete-button fa fa-trash text-red-500 cursor-pointer"></i>
          </div>
        </li>
      `
      )
      .join("");
    $("#todo-list").html(TodoListMap);
  }

  let id;
  $(document).on("click", ".edit-button", function () {
    id = $(this).closest("li").attr("data-id");
    let value = TodoList.find((todo) => todo.id == id);
    $("#todo-input").val(value.title);
    $("#category").val(value.category);
    getSubCategory();
    $("#subcategory").val(value.subcategory);
    edit = true;
    openModal(true);
  });

  $(document).on("click", ".delete-button", function () {
    const id = $(this).closest("li").attr("data-id");
    const index = TodoList.findIndex((todo) => todo.id == id);
    console.log(index);
    if (index !== -1) {
      TodoList.splice(index, 1);
      localStorage.setItem("Todo", JSON.stringify(TodoList));
      renderOutput();
    }
  });

  function openModal(update = false) {
    $("#todo-add-section").toggleClass("hidden");
    $(".plus-icon").toggleClass("rotate-45");
    $("#add-todo").text(update ? "Update Todo" : "Add Todo");
    $("#todo-label").text(update ? "Edit Todo" : "Write New Todo");
  }

  $(".plus-icon").click(function () {
    openModal();
    $("#todo-input").val("");
    $("#category").val("");
    $("#subcategory").val("");
    edit = false;
    getSubCategory();
  });

  $("#bg-light").on("click", function () {
    openModal();
    $("#todo-input").val("");
    $("#category").val("");
    $("#subcategory").val("");
    edit = false;
    getSubCategory();
  });

  $("#add-todo").click(function () {
    const title = $("#todo-input").val();
    const category = $("#category").val();
    const subcategory = $("#subcategory").val();

    if (title && category && subcategory) {
      if (edit) {
        const index = TodoList.findIndex((todo) => todo.id == id);
        if (index !== -1) {
          TodoList[index] = {
            id,
            title,
            category,
            subcategory,
            completed: false,
          };
          localStorage.setItem("Todo", JSON.stringify(TodoList));
          renderOutput();
          openModal();
        }
      } else {
        TodoList.push({
          id: TodoList.length + 1,
          title,
          category,
          subcategory,
          completed: false,
        });
        localStorage.setItem("Todo", JSON.stringify(TodoList));
        renderOutput();
        openModal();
      }
      $("#todo-input").val("");
      $("#category").val("");
      $("#subcategory").val("");
      getSubCategory();
    }
  });

  $(document).on("click", ".todo-item", function () {
    const dataId = $(this).parent().data("id");
    console.log(dataId);
    const todo = TodoList.find((todo) => todo.id == dataId);
    if (todo) {
      todo.completed = !todo.completed;
      localStorage.setItem("Todo", JSON.stringify(TodoList));
      renderOutput();
    }
  });

  renderOutput();

  // Render categories
  const categoriesMap = categories
    .map(
      (cat) => `
      <a href="todo-details.html?category=${cat.category}">
        <article class="todo-category flex items-center bg-gray-50/50 p-5 rounded-md shadow-md hover:shadow-lg transition-all cursor-pointer duration-300 divide-x gap-3 hover:-translate-y-1 w-80">
          <div class="text-3xl">${cat.icon}</div>
          <div class="pl-3">
            <h3 class="text-2xl font-bold text-gray-600">${cat.category}</h3>
            <p class="text-gray-400 text-semibold">You have ${cat.tasksToday} tasks today</p>
          </div>
        </article>
      </a>
    `
    )
    .join("");
  $(".todo-categories").html(`
    <h1 class="text-center text-4xl text-gray-900 font-bold">Todays Tasks</h1>
    ${categoriesMap}
  `);

  function getChatGPTSuggestions(message) {
    const apiKey = import.meta.env.VITE_GEMINI_KEY;
    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const generationConfig = {
      temperature: 1,
      topP: 0.95,
      topK: 64,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    };

    async function run() {
      const chatSession = model.startChat({
        generationConfig,
        history: [],
      });

      const result = await chatSession.sendMessage(message);
      console.log(JSON.parse(result.response.text()));
    }

    run();
  }
  renderSuggestionSlide({
    category: "Events",
    todos: [
      {
        name: "Birthdays",
        todo: [
          "Send birthday wishes to [Name]",
          "Plan a birthday party for [Name]",
          "Buy a birthday gift for [Name]",
          "Create a birthday card for [Name]",
          "Check if [Name] is available for a birthday celebration",
          "RSVP for [Name]'s birthday party",
        ],
      },
      {
        name: "Anniversaries",
        todo: [
          "Plan an anniversary celebration for [Name]",
          "Book a romantic dinner for [Name]",
          "Buy an anniversary gift for [Name]",
          "Create an anniversary card for [Name]",
          "Plan a getaway for the anniversary",
          "Renew vows for the anniversary",
        ],
      },
      {
        name: "Holidays",
        todo: [
          "Plan holiday travel",
          "Book flights and accommodations for holiday travel",
          "Buy holiday gifts",
          "Send holiday cards",
          "Decorate for the holiday",
          "Plan holiday meals",
          "Prepare for holiday gatherings",
        ],
      },
      {
        name: "Gatherings",
        todo: [
          "Plan a get-together with friends",
          "Organize a potluck dinner",
          "Host a game night",
          "Plan a movie night",
          "Coordinate a group activity",
          "Send out invitations for the gathering",
        ],
      },
      {
        name: "Appointments",
        todo: [
          "Schedule a doctor's appointment",
          "Schedule a dentist appointment",
          "Schedule a hair appointment",
          "Schedule a car maintenance appointment",
          "Schedule a meeting",
          "Schedule a conference call",
        ],
      },
    ],
  });

  function renderSuggestionSlide(result) {
    console.log(result);
    const sliderHtml = result.todos
      ?.map((res) => {
        return res?.todo
          ?.map((todo) => {
            return `<button class="suggestions w-max text-gray-500 font-semibold hover:bg-blue-500 hover:text-white rounded-full px-4 py-1 text-md divide-x-1 whitespace-nowrap cursor-pointer transition-all duration-300 border border-blue-200 ring-1 ring-offset-2 ring-blue-400 first:ml-6 last:mr-6" data-name="${todo}" data-category="${
              res.category || categoryParams
            }" data-subcategory="${
              res.name
            }">${todo} <span class="text-xs font-normal">(${
              res.name
            })</span></button>`;
          })
          .join("");
      })
      .join("");

    $("#suggestion-slider").html(sliderHtml);
  }

  $(document).on("click", ".suggestions", function () {
    const todo = $(this).data("name");
    const category = $(this).data("category");
    const subcategory = $(this).data("subcategory");
    $("#todo-input").val(todo);
    $("#category").val(category);
    getSubCategory();
    $("#subcategory").val(subcategory);
    openModal();
    edit = false;
  });
});
