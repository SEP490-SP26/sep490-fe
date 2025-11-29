import React from "react";

export default function Loading() {
  return (
    <div>
      {/* <LoadingOutlined /> */}
      <div className="flex space-x-2 justify-center items-center bg-white h-screen dark:invert">
        <span className="sr-only">Loading...</span>
        {/* 1 */}
        <div className="  animate-bounce [animation-delay:-0.75s]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="64"
            height="64"
            color="#000000"
            fill="none"
          >
            <path
              d="M12 21C15.7497 21 17.6246 21 18.9389 20.0451C19.3634 19.7367 19.7367 19.3634 20.0451 18.9389C21 17.6246 21 15.7497 21 12C21 8.25027 21 6.3754 20.0451 5.06107C19.7367 4.6366 19.3634 4.26331 18.9389 3.95492C17.6246 3 15.7497 3 12 3C8.25027 3 6.3754 3 5.06107 3.95491C4.6366 4.26331 4.26331 4.6366 3.95492 5.06107C3 6.3754 3 8.25027 3 12C3 15.7497 3 17.6246 3.95491 18.9389C4.26331 19.3634 4.6366 19.7367 5.06107 20.0451C6.3754 21 8.25027 21 12 21Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
             strokeLinejoin="round"
            />
            <path
              d="M12 12V12.01"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
             strokeLinejoin="round"
            />
          </svg>
        </div>
        {/* 2 */}
        <div className="animate-bounce [animation-delay:-0.60s]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="64"
            height="64"
            color="#000000"
            fill="none"
          >
            <path
              d="M12 21C15.7497 21 17.6246 21 18.9389 20.0451C19.3634 19.7367 19.7367 19.3634 20.0451 18.9389C21 17.6246 21 15.7497 21 12C21 8.25027 21 6.3754 20.0451 5.06107C19.7367 4.6366 19.3634 4.26331 18.9389 3.95492C17.6246 3 15.7497 3 12 3C8.25027 3 6.3754 3 5.06107 3.95491C4.6366 4.26331 4.26331 4.6366 3.95492 5.06107C3 6.3754 3 8.25027 3 12C3 15.7497 3 17.6246 3.95491 18.9389C4.26331 19.3634 4.6366 19.7367 5.06107 20.0451C6.3754 21 8.25027 21 12 21Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
             strokeLinejoin="round"
            />
            <path
              d="M8 8V8.01"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
             strokeLinejoin="round"
            />
            <path
              d="M16 16V16.01"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
             strokeLinejoin="round"
            />
          </svg>
        </div>
        {/* 3 */}
        <div className=" animate-bounce [animation-delay:-0.45s]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="64"
            height="64"
            color="#000000"
            fill="none"
          >
            <path
              d="M12 21C15.7497 21 17.6246 21 18.9389 20.0451C19.3634 19.7367 19.7367 19.3634 20.0451 18.9389C21 17.6246 21 15.7497 21 12C21 8.25027 21 6.3754 20.0451 5.06107C19.7367 4.6366 19.3634 4.26331 18.9389 3.95492C17.6246 3 15.7497 3 12 3C8.25027 3 6.3754 3 5.06107 3.95491C4.6366 4.26331 4.26331 4.6366 3.95492 5.06107C3 6.3754 3 8.25027 3 12C3 15.7497 3 17.6246 3.95491 18.9389C4.26331 19.3634 4.6366 19.7367 5.06107 20.0451C6.3754 21 8.25027 21 12 21Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
             strokeLinejoin="round"
            />
            <path
              d="M12 12V12.01"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
             strokeLinejoin="round"
            />
            <path
              d="M8 8V8.01"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
             strokeLinejoin="round"
            />
            <path
              d="M16 16V16.01"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
             strokeLinejoin="round"
            />
          </svg>
        </div>
        {/* 4 */}
        <div className=" animate-bounce [animation-delay:-0.3s]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="64"
            height="64"
            color="#000000"
            fill="none"
          >
            <path
              d="M12 21C15.7497 21 17.6246 21 18.9389 20.0451C19.3634 19.7367 19.7367 19.3634 20.0451 18.9389C21 17.6246 21 15.7497 21 12C21 8.25027 21 6.3754 20.0451 5.06107C19.7367 4.6366 19.3634 4.26331 18.9389 3.95492C17.6246 3 15.7497 3 12 3C8.25027 3 6.3754 3 5.06107 3.95491C4.6366 4.26331 4.26331 4.6366 3.95492 5.06107C3 6.3754 3 8.25027 3 12C3 15.7497 3 17.6246 3.95491 18.9389C4.26331 19.3634 4.6366 19.7367 5.06107 20.0451C6.3754 21 8.25027 21 12 21Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
             strokeLinejoin="round"
            />
            <path
              d="M16 8V8.01"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
             strokeLinejoin="round"
            />
            <path
              d="M8 16V16.01"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
             strokeLinejoin="round"
            />
            <path
              d="M8 8V8.01"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
             strokeLinejoin="round"
            />
            <path
              d="M16 16V16.01"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
             strokeLinejoin="round"
            />
          </svg>
        </div>
        {/* 5 */}
        <div className=" animate-bounce [animation-delay:-0.15s]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="64"
            height="64"
            color="#000000"
            fill="none"
          >
            <path
              d="M12 21C15.7497 21 17.6246 21 18.9389 20.0451C19.3634 19.7367 19.7367 19.3634 20.0451 18.9389C21 17.6246 21 15.7497 21 12C21 8.25027 21 6.3754 20.0451 5.06107C19.7367 4.6366 19.3634 4.26331 18.9389 3.95492C17.6246 3 15.7497 3 12 3C8.25027 3 6.3754 3 5.06107 3.95491C4.6366 4.26331 4.26331 4.6366 3.95492 5.06107C3 6.3754 3 8.25027 3 12C3 15.7497 3 17.6246 3.95491 18.9389C4.26331 19.3634 4.6366 19.7367 5.06107 20.0451C6.3754 21 8.25027 21 12 21Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
             strokeLinejoin="round"
            />
            <path
              d="M12 12V12.01"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
             strokeLinejoin="round"
            />
            <path
              d="M16 8V8.01"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
             strokeLinejoin="round"
            />
            <path
              d="M8 16V16.01"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
             strokeLinejoin="round"
            />
            <path
              d="M8 8V8.01"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
             strokeLinejoin="round"
            />
            <path
              d="M16 16V16.01"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
             strokeLinejoin="round"
            />
          </svg>
        </div>
        {/* 6 */}
        <div className=" animate-bounce ">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="64"
            height="64"
            color="#000000"
            fill="none"
          >
            <path
              d="M12 21C15.7497 21 17.6246 21 18.9389 20.0451C19.3634 19.7367 19.7367 19.3634 20.0451 18.9389C21 17.6246 21 15.7497 21 12C21 8.25027 21 6.3754 20.0451 5.06107C19.7367 4.6366 19.3634 4.26331 18.9389 3.95492C17.6246 3 15.7497 3 12 3C8.25027 3 6.3754 3 5.06107 3.95491C4.6366 4.26331 4.26331 4.6366 3.95492 5.06107C3 6.3754 3 8.25027 3 12C3 15.7497 3 17.6246 3.95491 18.9389C4.26331 19.3634 4.6366 19.7367 5.06107 20.0451C6.3754 21 8.25027 21 12 21Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
             strokeLinejoin="round"
            />
            <path
              d="M9 12V12.01"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
             strokeLinejoin="round"
            />
            <path
              d="M15 7V7.01"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
             strokeLinejoin="round"
            />
            <path
              d="M9 17V17.01"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
             strokeLinejoin="round"
            />
            <path
              d="M9 7V7.01"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
             strokeLinejoin="round"
            />
            <path
              d="M15 17V17.01"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
             strokeLinejoin="round"
            />
            <path
              d="M15 12V12.01"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
             strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
