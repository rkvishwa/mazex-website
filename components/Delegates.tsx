"use client";

import { motion } from "framer-motion";
import Link from "next/link";

type DelegatesProps = {
  hasDelegateBookletLink: boolean;
};

export default function Delegates({ hasDelegateBookletLink }: DelegatesProps) {
  return (
    <section id="delegates" className="theme-section relative pt-24 pb-32 sm:pt-32 sm:pb-40">
      <div className="absolute top-[10%] right-[-8%] h-[26.25rem] w-[26.25rem] rounded-full bg-[#A855F7]/10 opacity-40 blur-[9.375rem] pointer-events-none" />
      <div className="absolute bottom-[8%] left-[-8%] h-[22.5rem] w-[22.5rem] rounded-full bg-[#818CF8]/10 opacity-40 blur-[8.125rem] pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-6 text-center text-3xl font-bold text-[#F8FAFC] sm:text-4xl lg:text-5xl"
        >
          Delegate Booklet
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="theme-copy mx-auto mb-16 max-w-3xl text-center text-lg sm:text-xl"
        >
          Everything you need to know about MazeX 1.0 in one place. Our
          comprehensive delegate booklet covers the event schedule, competition
          rules, venue logistics, and technical resources.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="maze-card !px-8 !py-12 sm:!px-12 sm:!py-20 group"
        >
          <div className="maze-card-scan" />
          <div className="relative z-10 flex flex-col items-center gap-8 md:flex-row">
            <div className="flex-shrink-0">
              <div className="flex h-28 w-24 flex-col items-center justify-center rounded-none border border-[#2D374F] bg-[#0d0914] shadow-[0_0_20px_rgba(168,85,247,0.15)] transition-all group-hover:border-[#A855F7]/40 sm:h-32 sm:w-28">
                <svg fill="currentColor" className="h-16 w-16 text-[#C084FC] sm:h-22 sm:w-22" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 335.08 335.079" xmlSpace="preserve">
                  <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                  <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                  <g id="SVGRepo_iconCarrier">
                    <g>
                      <g>
                        <path d="M311.175,115.775c-1.355-10.186-1.546-27.73,7.915-33.621c0.169-0.108,0.295-0.264,0.443-0.398 c7.735-2.474,13.088-5.946,8.886-10.618l-114.102-34.38L29.56,62.445c0,0-21.157,3.024-19.267,35.894 c1.026,17.89,6.637,26.676,11.544,31l-15.161,4.569c-4.208,4.672,1.144,8.145,8.88,10.615c0.147,0.138,0.271,0.293,0.443,0.401 c9.455,5.896,9.273,23.438,7.913,33.626c-33.967,9.645-21.774,12.788-21.774,12.788l7.451,1.803 c-5.241,4.736-10.446,13.717-9.471,30.75c1.891,32.864,19.269,35.132,19.269,35.132l120.904,39.298l182.49-44.202 c0,0,12.197-3.148-21.779-12.794c-1.366-10.172-1.556-27.712,7.921-33.623c0.174-0.105,0.301-0.264,0.442-0.396 c7.736-2.474,13.084-5.943,8.881-10.615l-7.932-2.395c5.29-3.19,13.236-11.527,14.481-33.183 c0.859-14.896-3.027-23.62-7.525-28.756l15.678-3.794C332.949,128.569,345.146,125.421,311.175,115.775z M158.533,115.354 l30.688-6.307l103.708-21.312l15.451-3.178c-4.937,9.036-4.73,21.402-3.913,29.35c0.179,1.798,0.385,3.44,0.585,4.688 L288.14,122.8l-130.897,32.563L158.533,115.354z M26.71,147.337l15.449,3.178l99.597,20.474l8.701,1.782l0,0l0,0l26.093,5.363 l1.287,40.01L43.303,184.673l-13.263-3.296c0.195-1.25,0.401-2.89,0.588-4.693C31.44,168.742,31.651,156.373,26.71,147.337z M20.708,96.757c-0.187-8.743,1.371-15.066,4.52-18.28c2.004-2.052,4.369-2.479,5.991-2.479c0.857,0,1.474,0.119,1.516,0.119 l79.607,25.953l39.717,12.949l-1.303,40.289L39.334,124.07l-5.88-1.647c-0.216-0.061-0.509-0.103-0.735-0.113 C32.26,122.277,21.244,121.263,20.708,96.757z M140.579,280.866L23.28,247.98c-0.217-0.063-0.507-0.105-0.733-0.116 c-0.467-0.031-11.488-1.044-12.021-25.544c-0.19-8.754,1.376-15.071,4.519-18.288c2.009-2.052,4.375-2.479,5.994-2.479 c0.859,0,1.474,0.115,1.519,0.115c0,0,0.005,0,0,0l119.316,38.908L140.579,280.866z M294.284,239.459 c0.185,1.804,0.391,3.443,0.591,4.693l-147.812,36.771l1.292-40.01l31.601-6.497l4.667,1.129l17.492-5.685l80.631-16.569 l15.457-3.18C293.261,219.146,293.466,231.517,294.284,239.459z M302.426,185.084c-0.269,0.006-0.538,0.042-0.791,0.122 l-11.148,3.121l-106.148,29.764l-1.298-40.289l34.826-11.359l84.327-27.501c0.011-0.005,4.436-0.988,7.684,2.315 c3.144,3.214,4.704,9.537,4.52,18.28C313.848,184.035,302.827,185.053,302.426,185.084z"></path>
                      </g>
                    </g>
                  </g>
                </svg>
              </div>
            </div>

            <div className="flex-1 text-center md:text-left">
              <h3 className="mb-3 text-xl font-bold text-[#F8FAFC] sm:text-2xl">
                Download the Official Delegate Booklet
              </h3>
              <p className="max-w-xl text-sm leading-relaxed text-[#9e8db3] sm:text-base">
                Get your hands on the complete guide: event schedules,
                competition rules, venue navigation, and all the technical
                resources you&apos;ll need. Available as a convenient PDF for
                offline access.
              </p>
            </div>

            <div className="flex-shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
              {hasDelegateBookletLink ? (
                <Link
                  href="/resources/delegate-booklet"
                  className="theme-button theme-button-register flex w-full sm:inline-flex justify-center items-center gap-2 sm:gap-3 rounded-full px-6 py-3.5 sm:px-8 sm:py-4 text-sm sm:text-base font-bold"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Download Booklet
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  title="Delegate booklet link is not available yet"
                  className="theme-button theme-button-register flex w-full sm:inline-flex justify-center items-center gap-2 sm:gap-3 rounded-full px-6 py-3.5 sm:px-8 sm:py-4 text-sm sm:text-base font-bold opacity-50 cursor-not-allowed"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Download Booklet
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
