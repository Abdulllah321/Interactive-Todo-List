import { categories } from "./constants.js";

$(document).ready(function () {
  let TodoList = JSON.parse(localStorage.getItem("Todo")) || [];
  const urlParams = new URLSearchParams(window.location.search);
  const categoryParams = urlParams.get("category");
  let edit = false;
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
      ?.subcategories?.map(
        (sub) => `
        <button class="flex gap-1 w-max rounded-full px-4 py-1 font-base text-sm divide-x-1 whitespace-nowrap cursor-pointer transition-all duration-300
        ${
          filteredTodos.includes(sub.name)
            ? "bg-blue-400 text-white shadow-md"
            : "bg-gray-200 shadow-sm"
        }" 
        data-title="${sub.name}">
          <span>${sub.icon}</span>${sub.name}
        </button>
      `
      )
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

  $("#filter-slider-container").on({
    mousedown(e) {
      isDown = true;
      $("#filter-slider-container").addClass("active");
      startX = e.pageX - $(this).scrollLeft();
      scrollLeft = $(this).scrollLeft();
    },
    mouseleave() {
      isDown = false;
      $("#filter-slider-container").removeClass("active");
    },
    mouseup() {
      isDown = false;
      $("#filter-slider-container").removeClass("active");
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
    const todo = TodoList.find((todo) => todo.id === dataId);
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
});
