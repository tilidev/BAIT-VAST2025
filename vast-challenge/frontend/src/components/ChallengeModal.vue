<template>
  <transition name="modal-fade">
    <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm" @click.self="closeModal">
      <div class="relative w-full max-w-4xl mx-auto my-6 bg-white dark:bg-gray-900 rounded-lg shadow-2xl transform transition-all duration-300 ease-in-out border border-gray-200 dark:border-gray-800">
        <!--header-->
        <div class="flex items-start justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h3 class="text-2xl font-semibold text-gray-900 dark:text-white">
              BAIT: Bias Analytics & Investigation Tool
            </h3>
            <a href="https://vast-challenge.github.io/2025/" target="_blank" rel="noopener noreferrer" class="text-sm font-medium text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300 mt-1 transition-colors">VAST Challenge 2025 Mini-Challenge 2</a>
            <div class="mt-3">
              <h4 class="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Authors</h4>
              <div class="flex items-center gap-4">
                <a v-for="author in authors" :key="author.email" :href="'mailto:' + author.email" class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-500 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  {{ author.name }}
                </a>
              </div>
            </div>
          </div>
          <button class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800" @click="closeModal">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <!--body-->
        <div class="relative p-6 flex-auto overflow-y-auto max-h-[70vh]" @scroll="handleScroll">
          <div class="space-y-8 text-gray-700 dark:text-gray-300 text-base leading-relaxed">

            <!-- Challenge Overview -->
            <div class="fade-in">
              <h4 class="text-xl font-bold mb-2 text-gray-800 dark:text-white">The Challenge</h4>
              <p>Investigate accusations of bias within the <strong class="text-purple-400 tooltip">COOTEFOO<span class="tooltiptext">Commission on Overseeing the Economic Future of Oceanus</span></strong>, a government board overseeing economic development in Oceanus. Two rival industry groups, <strong class="text-blue-400 tooltip">FILAH<span class="tooltiptext">Fishing is Living and Heritage</span></strong> and <strong class="text-green-400 tooltip">TROUT<span class="tooltiptext">Tourism Raises OceanUs Together</span></strong>, have accused the board of favoring the other. Our mission is to analyze the provided data and create visualizations to help a journalist uncover the truth.</p>
            </div>

            <!-- Data Description -->
            <div class="fade-in">
              <h4 class="text-xl font-bold mb-2 text-gray-800 dark:text-white">The Data</h4>
              <p>The data for this challenge is provided in three JSON files, representing different perspectives on the situation:</p>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-300">
                  <svg class="w-12 h-12 mx-auto text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  <h5 class="font-bold mt-2 text-gray-800 dark:text-white">FILAH.json</h5>
                  <p class="text-sm text-gray-600 dark:text-gray-400">Data collected by the fishing industry.</p>
                </div>
                <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-green-500 dark:hover:border-green-500 transition-all duration-300">
                  <svg class="w-12 h-12 mx-auto text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  <h5 class="font-bold mt-2 text-gray-800 dark:text-white">TROUT.json</h5>
                  <p class="text-sm text-gray-600 dark:text-gray-400">Data collected by the tourism industry.</p>
                </div>
                <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-purple-500 dark:hover:border-purple-500 transition-all duration-300">
                  <svg class="w-12 h-12 mx-auto text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  <h5 class="font-bold mt-2 text-gray-800 dark:text-white">journalist.json</h5>
                  <p class="text-sm text-gray-600 dark:text-gray-400">A more complete dataset obtained by the journalist.</p>
                </div>
              </div>
              <p class="mt-4">These datasets are knowledge graphs containing information about meeting minutes and travel records. Additionally, a <code class="text-sm font-mono bg-gray-200 dark:bg-gray-700 rounded px-1 py-0.5">oceanus_map.geojson</code> file is provided for geographical context. You can find a detailed schema description in the <a href="https://github.com/vast-challenge/2025-data" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">official challenge documentation</a>.</p>
            </div>

            <!-- Our Solution & Comparison -->
            <div class="fade-in flex flex-col md:flex-row gap-8">
              <!-- Our Solution -->
              <div class="flex-1">
                <h4 class="text-xl font-bold mb-2 text-gray-800 dark:text-white">Our Solution</h4>
                <p>Our tool helps journalists identify biases with these visualizations:</p>
                <div class="space-y-2 mt-4">
                  <div class="flex items-start p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <div class="flex-shrink-0 h-6 w-6">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48 48 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0q1.515.215 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a6 6 0 0 1-2.031.352a6 6 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202zm-16.5.52q1.485-.305 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a6 6 0 0 1-2.031.352a6 6 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202z"/></svg>
                    </div>
                    <p class="ml-4 text-sm text-gray-700 dark:text-gray-300"><strong>Scale</strong> to identify bias for each member and dataset.</p>
                  </div>
                  <div class="flex items-start p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <div class="flex-shrink-0 h-6 w-6">
                      <svg fill="currentColor" viewBox="0 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg" class="w-6 h-6"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <title>network</title> <path d="M27 22.25c-0.831 0.002-1.598 0.277-2.215 0.739l0.010-0.007-3.299-2.998c0.82-1.097 1.313-2.479 1.313-3.977 0-1.614-0.572-3.094-1.525-4.249l0.009 0.011 3.644-3.643c0.584 0.391 1.302 0.624 2.074 0.624 2.077 0 3.76-1.683 3.76-3.76s-1.683-3.76-3.76-3.76c-2.077 0-3.76 1.683-3.76 3.76 0 0.773 0.233 1.491 0.633 2.088l-0.009-0.014-3.643 3.643c-1.145-0.944-2.627-1.517-4.244-1.517-0.937 0-1.828 0.192-2.638 0.54l0.044-0.017-1.032-1.874c0.791-0.688 1.288-1.695 1.288-2.819 0-2.060-1.67-3.729-3.729-3.729s-3.729 1.67-3.729 3.729c0 2.060 1.67 3.729 3.729 3.729 0.007 0 0.015-0 0.022-0h-0.001c0.398-0.006 0.778-0.073 1.133-0.194l-0.026 0.008 1.037 1.883c-1.757 1.243-2.89 3.265-2.894 5.553v0.001c0.010 0.697 0.125 1.364 0.33 1.99l-0.013-0.047-1.423 0.603c-0.681-0.971-1.795-1.597-3.056-1.597-2.056 0-3.722 1.666-3.722 3.722s1.666 3.722 3.722 3.722c2.056 0 3.722-1.666 3.722-3.722 0-0.264-0.027-0.521-0.079-0.769l0.004 0.024 1.419-0.602c1.167 2.093 3.367 3.485 5.892 3.485 1.73 0 3.308-0.654 4.5-1.728l-0.006 0.005 3.309 3.007c-0.335 0.544-0.535 1.201-0.539 1.906v0.001c0 2.071 1.679 3.75 3.75 3.75s3.75-1.679 3.75-3.75c0-2.071-1.679-3.75-3.75-3.75v0zM7.69 5c0-1.243 1.007-2.25 2.25-2.25s2.25 1.007 2.25 2.25c0 1.243-1.007 2.25-2.25 2.25v0c-1.242-0.002-2.248-1.008-2.25-2.25v-0zM5 22.92c-1.242-0.001-2.248-1.007-2.248-2.249s1.007-2.249 2.249-2.249c1.242 0 2.248 1.006 2.249 2.248v0c-0.002 1.242-1.008 2.248-2.25 2.25h-0zM27 2.75c1.243 0 2.25 1.007 2.25 2.25s-1.007 2.25-2.25 2.25c-1.243 0-2.25-1.007-2.25-2.25v0c0.002-1.242 1.008-2.248 2.25-2.25h0zM10.69 16c0-0 0-0 0-0.001 0-2.932 2.377-5.309 5.309-5.309s5.309 2.377 5.309 5.309c0 2.932-2.377 5.309-5.309 5.309h-0c-2.931-0.003-5.306-2.378-5.31-5.308v-0zM27 28.25c-1.243 0-2.25-1.007-2.25-2.25s1.007-2.25 2.25 2.25c1.243 0 2.25 1.007 2.25 2.25v0c-0.002 1.242-1.008 2.248-2.25 2.25h-0z"></path> </g></svg>
                    </div>
                    <p class="ml-4 text-sm text-gray-700 dark:text-gray-300"><strong>Ego network graph</strong> to understand entity relationships and network structure.</p>
                  </div>
                  <div class="flex items-start p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <div class="flex-shrink-0 h-6 w-6">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                      </svg>
                    </div>
                    <p class="ml-4 text-sm text-gray-700 dark:text-gray-300"><strong>Trip analysis view</strong> to investigate travel patterns and conflicts of interest.</p>
                  </div>
                </div>
              </div>
              
              <!-- DatasetNodeComparison -->
              <div class="h-auto md:h-64 flex-1">
                <DatasetNodeComparison />
              </div>
            </div>

          </div>
        </div>
        <!--footer-->
        <div class="flex items-center justify-end p-6 border-t border-gray-200 dark:border-gray-800">
          <button type="button" @click="closeModal" class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-700 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            Close
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
import { defineComponent } from 'vue';
import DatasetNodeComparison from './mini-visualizations/DatasetNodeComparison.vue';

export default defineComponent({
  name: 'ChallengeModal',
  components: {
    DatasetNodeComparison,
  },
  props: {
    isOpen: {
      type: Boolean,
      required: true,
    },
  },
  emits: ['close'],
  data() {
    return {
      showTooltip: null,
      authors: [
        { name: 'Paul Müller', email: 'paul.mueller@uni-konstanz.de' },
        { name: 'Tilio Schulze', email: 'tilio.schulze@uni-konstanz.de' },
      ],
    };
  },
  created() {
    this.shuffleAuthors();
  },
  methods: {
    shuffleAuthors() {
      for (let i = this.authors.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.authors[i], this.authors[j]] = [this.authors[j], this.authors[i]];
      }
    },
    closeModal() {
      this.$emit('close');
    },
    handleScroll(event) {
      const elements = event.target.querySelectorAll('.fade-in');
      elements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom >= 0) {
          el.classList.add('is-visible');
        }
      });
    },
  },
  watch: {
    isOpen(newValue) {
      if (newValue) {
        this.$nextTick(() => {
          const container = this.$el.querySelector('.overflow-y-auto');
          if (container) {
            container.addEventListener('scroll', this.handleScroll);
            this.handleScroll({ target: container }); // Initial check
          }
        });
      } else {
        const container = this.$el.querySelector('.overflow-y-auto');
        if (container) {
          container.removeEventListener('scroll', this.handleScroll);
        }
      }
    },
  },
});
</script>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .transform,
.modal-fade-leave-active .transform {
  transition: all 0.3s ease;
}

.modal-fade-enter-from .transform,
.modal-fade-leave-to .transform {
  transform: scale(0.95);
}

.fade-in {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.fade-in.is-visible {
  opacity: 1;
  transform: translateY(0);
}

.tooltip {
  position: relative;
  display: inline-block;
}

.tooltip .tooltiptext {
  visibility: hidden;
  width: 200px;
  background-color: #555;
  color: #fff;
  text-align: center;
  border-radius: 6px;
  padding: 5px 0;
  position: absolute;
  z-index: 1;
  bottom: 125%;
  left: 50%;
  margin-left: -100px;
  opacity: 0;
  transition: opacity 0.3s;
}

.tooltip:hover .tooltiptext {
  visibility: visible;
  opacity: 1;
}
</style>
