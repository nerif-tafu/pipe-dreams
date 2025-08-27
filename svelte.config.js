import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			out: 'build'
		}),
		// Ensure API routes are properly handled
		alias: {
			$lib: './src/lib'
		}
	}
};

export default config;
